import {
  type SigningData,
  type Network,
  type ApprovalController,
  type DisplayData,
  type RpcRequest,
  RpcMethod,
  type SigningResult,
  type DetailSection,
  type DetailItem,
  type Hex,
} from '@avalabs/vm-module-types';
import { parseRequestParams } from './schemas/parse-request-params/parse-request-params';
import { rpcErrors } from '@metamask/rpc-errors';
import { Avalanche } from '@avalabs/core-wallets-sdk';
import { avaxSerial, EVM, EVMUnsignedTx, PVM, UnsignedTx, utils } from '@avalabs/avalanchejs';
import { getProvider } from '../../utils/get-provider';
import { getProvidedUtxos } from './utils/get-provided-utxos';
import { parseTxDetails } from './utils/parse-tx-details';
import { parseTxDisplayTitle } from './utils/parse-tx-display-title';
import {
  isBlockchainDetails,
  isChainDetails,
  isSubnetDetails,
  isExportTx,
  isImportTx,
  isAddPermissionlessDelegatorTx,
  isAddPermissionlessValidatorTx,
  isAddSubnetValidatorTx,
  isRemoveSubnetValidatorTx,
} from './typeguards';
import { TokenUnit } from '@avalabs/core-utils-sdk';
import { isPrimarySubnet } from './utils/is-primary-subnet';
import { formatDate } from './utils/format-date';
import { textItem, addressItem, currencyItem, nodeIDItem } from '@internal/utils';
import { retry } from '@internal/utils/src/utils/retry';
import { getAddressesByIndices } from './utils/get-addresses-by-indices';

const GLACIER_API_KEY = process.env.GLACIER_API_KEY;

enum AvalancheChainStrings {
  AVM = 'X Chain',
  PVM = 'P Chain',
  EVM = 'C Chain',
}

export const avalancheSendTransaction = async ({
  request,
  network,
  approvalController,
  glacierApiUrl,
}: {
  request: RpcRequest;
  network: Network;
  approvalController: ApprovalController;
  glacierApiUrl: string;
}) => {
  const result = parseRequestParams(request.params);

  if (!result.success) {
    return {
      error: rpcErrors.invalidParams({ message: 'Transaction params are invalid', data: { cause: result.error } }),
    };
  }

  try {
    const { transactionHex, chainAlias, externalIndices, internalIndices, utxos: providedUtxoHexes } = result.data;
    const vm = Avalanche.getVmByChainAlias(chainAlias);
    const txBytes = utils.hexToBuffer(transactionHex);
    const isTestnet = network.isTestnet ?? false;
    const provider = getProvider({ isTestnet });
    const currentAddress = request.context?.['currentAddress'];

    if (!currentAddress || typeof currentAddress !== 'string') {
      return {
        error: rpcErrors.invalidRequest('No active account found'),
      };
    }

    const providedUtxos = getProvidedUtxos({
      utxoHexes: providedUtxoHexes,
      vm,
    });

    const utxos = providedUtxos.length
      ? providedUtxos
      : await Avalanche.getUtxosByTxFromGlacier({
          transactionHex,
          chainAlias,
          isTestnet,
          url: glacierApiUrl,
          token: GLACIER_API_KEY,
        });

    let unsignedTx: UnsignedTx | EVMUnsignedTx;
    if (chainAlias === 'C') {
      unsignedTx = await Avalanche.createAvalancheEvmUnsignedTx({
        txBytes,
        vm,
        utxos,
        fromAddress: currentAddress,
      });
    } else {
      const tx = utils.unpackWithManager(vm, txBytes) as avaxSerial.AvaxTx;
      const xpubXP = request.context?.['xpubXP'];

      if (!xpubXP || typeof xpubXP !== 'string') {
        return {
          error: rpcErrors.invalidParams('Request should have xpubXP in context'),
        };
      }

      const externalAddresses = await getAddressesByIndices({
        indices: externalIndices ?? [],
        chainAlias,
        isChange: false,
        isTestnet,
        xpubXP,
      });

      const internalAddresses = await getAddressesByIndices({
        indices: internalIndices ?? [],
        chainAlias,
        isChange: true,
        isTestnet,
        xpubXP,
      });

      const fromAddresses = [...new Set([currentAddress, ...externalAddresses, ...internalAddresses])];

      const fromAddressBytes = fromAddresses.map((address) => utils.parse(address)[2]);

      unsignedTx = await Avalanche.createAvalancheUnsignedTx({
        tx,
        utxos,
        provider,
        fromAddressBytes,
      });
    }

    const txData = await Avalanche.parseAvalancheTx(unsignedTx, provider, currentAddress);

    const txDetails = parseTxDetails(txData);
    const title = parseTxDisplayTitle(txData);

    // Throw an error if we can't parse the transaction
    if (txData.type === 'unknown' || txDetails === undefined) {
      return {
        error: rpcErrors.internal('Unable to parse transaction data. Unsupported tx type'),
      };
    }

    const signingData: SigningData = {
      type: RpcMethod.AVALANCHE_SEND_TRANSACTION,
      unsignedTxJson: JSON.stringify(unsignedTx.toJSON()),
      data: txData,
      vm,
    };

    const details: DetailSection[] = [];

    if (isChainDetails(txDetails)) {
      const { chain, outputs, memo } = txDetails;

      details.push({
        title: 'Chain Details',
        items: [textItem('Active chain', `Avalanche ${AvalancheChainStrings[chain]}`)],
      });

      outputs.forEach((output, index) => {
        const balanceChangeItems: DetailItem[] = output.owners.flatMap((ownerAddress) => [
          addressItem('To', ownerAddress),
          textItem(
            'Amount',
            `${new TokenUnit(
              output.amount,
              network.networkToken.decimals,
              network.networkToken.symbol,
            ).toDisplay()} AVAX`,
          ),
        ]);

        if (output.owners.length > 1) {
          balanceChangeItems.push(textItem('Threshold', output.threshold.toString()));
        }

        details.push({
          title: index === 0 ? 'Balance Change' : undefined,
          items: balanceChangeItems,
        });
      });

      if (chain !== PVM && !!memo) {
        details.push({
          title: 'Memo',
          items: [memo],
        });
      }
    } else if (isExportTx(txDetails)) {
      const { amount, chain, destination, type } = txDetails;

      details.push({
        title: 'Transaction Details',
        items: [
          textItem('Source Chain', `Avalanche ${AvalancheChainStrings[chain]}`),
          textItem('Target Chain', `Avalanche ${AvalancheChainStrings[destination]}`),
          textItem('Transaction Type', type ? (type[0] || '').toUpperCase() + type.slice(1) : ''),
          currencyItem('Amount', amount, network.networkToken.decimals, network.networkToken.symbol),
        ],
      });
    } else if (isImportTx(txDetails)) {
      // todo: test
      const { amount, chain, source, type } = txDetails;

      details.push({
        title: 'Transaction Details',
        items: [
          textItem('Source Chain', `Avalanche ${AvalancheChainStrings[source]}`),
          textItem('Destination Chain', `Avalanche ${AvalancheChainStrings[chain]}`),
          textItem('Transaction Type', type ? (type[0] || '').toUpperCase() + type.slice(1) : ''),
          currencyItem('Amount', amount, network.networkToken.decimals, network.networkToken.symbol),
        ],
      });
    } else if (isSubnetDetails(txDetails)) {
      const { threshold, controlKeys } = txDetails;

      details.push({
        title: 'Subnet Details',
        items: [
          textItem(controlKeys.length > 1 ? 'Owners' : 'Owner', controlKeys.join('\n'), 'vertical'),
          textItem('Signature Threshold', `${threshold}/${controlKeys.length}`, 'vertical'),
        ],
      });
    } else if (isAddPermissionlessDelegatorTx(txDetails)) {
      const { nodeID, start, end, stake, subnetID } = txDetails;

      const items: DetailItem[] = [
        nodeIDItem('Node ID', nodeID),
        isPrimarySubnet(subnetID) ? textItem('Subnet ID', 'Primary Network') : nodeIDItem('Subnet ID', subnetID),
        currencyItem('Stake Amount', stake, network.networkToken.decimals, network.networkToken.symbol),
        textItem('Start Date', formatDate(parseInt(start))),
        textItem('End Date', formatDate(parseInt(end))),
      ];

      details.push({
        title: 'Staking Details',
        items,
      });
    } else if (isAddPermissionlessValidatorTx(txDetails)) {
      const { nodeID, delegationFee, start, end, stake, subnetID, signature, publicKey } = txDetails;

      const items: DetailItem[] = [
        nodeIDItem('Node ID', nodeID),
        isPrimarySubnet(subnetID) ? textItem('Subnet ID', 'Primary Network') : nodeIDItem('Subnet ID', subnetID),
      ];

      if (publicKey && signature) {
        items.push(nodeIDItem('Public Key', publicKey), nodeIDItem('Proof', signature));
      }

      items.push(
        currencyItem('Stake Amount', stake, network.networkToken.decimals, network.networkToken.symbol),
        textItem('Delegation Fee', `${delegationFee / 10000} %`),
        textItem('Start Date', formatDate(parseInt(start))),
        textItem('End Date', formatDate(parseInt(end))),
      );

      details.push({
        title: 'Staking Details',
        items,
      });
    } else if (isBlockchainDetails(txDetails)) {
      // todo: test
      // handle genesis data similarly to how we handle data in transaction details
      const { chainID, chainName, vmID, genesisData } = txDetails;

      const items: DetailItem[] = [
        textItem('Blockchain name', chainName, 'vertical'),
        textItem('Blockchain ID', chainID, 'vertical'),
        textItem('Virtual Machine ID', vmID, 'vertical'),
        textItem('Genesis Data', genesisData, 'vertical'),
      ];

      details.push({
        title: 'Blockchain Details',
        items,
      });
    } else if (isAddSubnetValidatorTx(txDetails)) {
      // todo: test
      const { nodeID, start, end, subnetID } = txDetails;

      const items: DetailItem[] = [
        nodeIDItem('Subnet ID', subnetID),
        nodeIDItem('Node ID', nodeID),
        textItem('Start Date', formatDate(parseInt(start))),
        textItem('End Date', formatDate(parseInt(end))),
      ];

      details.push({
        title: 'Staking Details',
        items,
      });
    } else if (isRemoveSubnetValidatorTx(txDetails)) {
      // todo: test
      const { nodeID, subnetID } = txDetails;

      const items: DetailItem[] = [nodeIDItem('Node ID', nodeID), nodeIDItem('Subnet ID', subnetID)];

      details.push({
        title: 'Staking Details',
        items,
      });
    }

    const { txFee } = txDetails;
    if (txFee) {
      details.push({
        title: 'Network Fee',
        items: [currencyItem('Fee Amount', txFee, network.networkToken.decimals, network.networkToken.symbol)],
      });
    }

    const displayData: DisplayData = {
      title,
      network: {
        chainId: network.chainId,
        name: network.chainName,
        logoUri: network.logoUri,
      },
      details,
      networkFeeSelector: false,
    };

    // prompt user for approval
    const response = await approvalController.requestApproval({ request, displayData, signingData });

    if ('error' in response) {
      return {
        error: response.error,
      };
    }

    const txHash = (await getTxHash(provider, response, vm)) as Hex;

    await waitForTransactionReceipt({
      provider,
      txHash,
      vm,
      onTransactionConfirmed: approvalController.onTransactionConfirmed,
      onTransactionReverted: approvalController.onTransactionReverted,
    });

    return { result: txHash };
  } catch (error) {
    console.error(error);
    return {
      error: rpcErrors.internal('Unable to create transaction'),
    };
  }
};

const getTxHash = async (provider: Avalanche.JsonRpcProvider, response: SigningResult, vm: 'EVM' | 'AVM' | 'PVM') => {
  if ('txHash' in response) {
    return response.txHash;
  }

  // broadcast the signed transaction
  const { txID } = await provider.issueTxHex(response.signedData, vm);
  return txID;
};

const waitForTransactionReceipt = async ({
  provider,
  txHash,
  vm,
  onTransactionConfirmed,
  onTransactionReverted,
}: {
  provider: Avalanche.JsonRpcProvider;
  txHash: Hex;
  vm: 'EVM' | 'AVM' | 'PVM';
  onTransactionConfirmed: (txHash: Hex) => void;
  onTransactionReverted: (txHash: Hex) => void;
}) => {
  if (vm === EVM) {
    const receipt = await provider.evmRpc.waitForTransaction(txHash);

    const success = receipt?.status === 1; // 1 indicates success, 0 indicates revert

    if (success) {
      onTransactionConfirmed(txHash);
    } else {
      onTransactionReverted(txHash);
    }
  } else {
    try {
      const maxTransactionStatusCheckRetries = 7;

      await retry({
        operation: () => provider.getApiP().getTxStatus({ txID: txHash }),
        isSuccess: (result) => result.status === 'Committed',
        maxRetries: maxTransactionStatusCheckRetries,
      });

      onTransactionConfirmed(txHash);
    } catch (error) {
      onTransactionReverted(txHash);
    }
  }
};
