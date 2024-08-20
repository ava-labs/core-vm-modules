import {
  type SigningData,
  type Network,
  type ApprovalController,
  type DisplayData,
  type RpcRequest,
  RpcMethod,
  type SigningResult,
  type Hex,
} from '@avalabs/vm-module-types';
import { parseRequestParams } from './schemas/parse-request-params/parse-request-params';
import { rpcErrors } from '@metamask/rpc-errors';
import { Avalanche } from '@avalabs/core-wallets-sdk';
import { avaxSerial, AVM, EVMUnsignedTx, PVM, UnsignedTx, utils } from '@avalabs/avalanchejs';
import { getProvider } from '../../utils/get-provider';
import { getProvidedUtxos } from './utils/get-provided-utxos';
import { parseTxDetails } from './utils/parse-tx-details';
import { parseTxDisplayTitle } from './utils/parse-tx-display-title';
import { retry } from '@internal/utils/src/utils/retry';
import { getAddressesByIndices } from './utils/get-addresses-by-indices';
import { getTransactionDetailSections } from '../../utils/get-transaction-detail-sections';

const GLACIER_API_KEY = process.env.GLACIER_API_KEY;

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

    const details = getTransactionDetailSections(txDetails, network.networkToken);

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

    waitForTransactionReceipt({
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
      error: rpcErrors.internal({ message: 'Unable to create transaction', data: { cause: error } }),
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
  const maxTransactionStatusCheckRetries = 7;

  if (vm === PVM) {
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
  } else if (vm === AVM) {
    try {
      await retry({
        operation: () => provider.getApiX().getTxStatus({ txID: txHash }),
        isSuccess: (result) => result.status === 'Accepted',
        maxRetries: maxTransactionStatusCheckRetries,
      });

      onTransactionConfirmed(txHash);
    } catch (error) {
      console.error(error);
      onTransactionReverted(txHash);
    }
  } else {
    try {
      const receipt = await provider.evmRpc.waitForTransaction(txHash);

      const success = receipt?.status === 1; // 1 indicates success, 0 indicates revert

      if (success) {
        onTransactionConfirmed(txHash);
      } else {
        onTransactionReverted(txHash);
      }
    } catch (error) {
      console.error(error);
      onTransactionReverted(txHash);
    }
  }
};
