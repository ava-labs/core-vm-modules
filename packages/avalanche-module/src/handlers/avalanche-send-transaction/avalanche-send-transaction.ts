import {
  type SigningData,
  type Network,
  type ApprovalController,
  type DisplayData,
  type RpcRequest,
  RpcMethod,
  type SigningResult,
  type Hex,
  type AppInfo,
} from '@avalabs/vm-module-types';
import { Network as GlacierNetwork } from '@avalabs/glacier-sdk';
import { parseRequestParams } from './schema';
import { rpcErrors } from '@metamask/rpc-errors';
import { Avalanche } from '@avalabs/core-wallets-sdk';
import { avaxSerial, AVM, EVMUnsignedTx, PVM, UnsignedTx, utils } from '@avalabs/avalanchejs';
import { getProvider } from '../../utils/get-provider';
import { getProvidedUtxos } from '../../utils/get-provided-utxos';
import { parseTxDetails } from '../../utils/parse-tx-details';
import { parseTxDisplayTitle } from './utils/parse-tx-display-title';
import { getCoreHeaders, getGlacierApiKey, retry } from '@internal/utils';
import { getAddressesByIndices } from './utils/get-addresses-by-indices';
import { getTransactionDetailSections } from '../../utils/get-transaction-detail-sections';
import { getExplorerAddressByNetwork } from '../get-transaction-history/utils';
import { getAccountFromContext } from '../../utils/get-account-from-context';

export const avalancheSendTransaction = async ({
  request,
  network,
  approvalController,
  glacierApiUrl,
  appInfo,
}: {
  request: RpcRequest;
  network: Network;
  approvalController: ApprovalController;
  glacierApiUrl: string;
  appInfo: AppInfo;
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
    const provider = await getProvider({ isTestnet });
    const contextResult = getAccountFromContext(request.context);

    if (!contextResult.success) {
      return {
        error: rpcErrors.invalidParams(contextResult.error),
      };
    }

    const { xpAddress: currentAddress, xpubXP, externalXPAddresses } = contextResult.data;

    const providedUtxos = getProvidedUtxos({
      utxoHexes: providedUtxoHexes,
      vm,
    });

    const utxos = providedUtxos.length
      ? providedUtxos
      : await Avalanche.getUtxosByTxFromGlacier({
          transactionHex,
          chainAlias,
          network: isTestnet ? GlacierNetwork.FUJI : GlacierNetwork.MAINNET,
          url: glacierApiUrl,
          token: getGlacierApiKey(),
          headers: getCoreHeaders(appInfo),
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

      if (xpubXP !== undefined && typeof xpubXP !== 'string') {
        return {
          error: rpcErrors.invalidParams('xpubXP must be a string'),
        };
      }

      const externalAddresses = await getAddressesByIndices({
        indices: externalIndices ?? [],
        chainAlias,
        isChange: false,
        isTestnet,
        xpubXP,
        externalXPAddresses,
      });

      const internalAddresses = await getAddressesByIndices({
        indices: internalIndices ?? [],
        chainAlias,
        isChange: true,
        isTestnet,
        xpubXP,
        externalXPAddresses,
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
      externalIndices,
      internalIndices,
    };

    const details = getTransactionDetailSections(txDetails, network.networkToken.symbol, {
      network,
      signerAccount: currentAddress,
    });

    // Throw an error if we can't parse the transaction details
    if (details === undefined) {
      return {
        error: rpcErrors.internal('Unable to parse transaction display data. Unsupported tx type'),
      };
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

    let txHash: Hex;

    try {
      txHash = (await getTxHash(provider, response, vm)) as Hex;
    } catch (error) {
      return {
        error: rpcErrors.internal({
          message: `Unable to broadcast transaction${error instanceof Error ? `: ${error.message}` : ''}`,
          data: { cause: error },
        }),
      };
    }

    waitForTransactionReceipt({
      explorerUrl: network.explorerUrl ?? '',
      provider,
      txHash,
      vm,
      onTransactionPending: approvalController.onTransactionPending,
      onTransactionConfirmed: approvalController.onTransactionConfirmed,
      onTransactionReverted: approvalController.onTransactionReverted,
      request: request,
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
  explorerUrl,
  provider,
  txHash,
  vm,
  onTransactionPending,
  onTransactionConfirmed,
  onTransactionReverted,
  request,
}: {
  explorerUrl: string;
  provider: Avalanche.JsonRpcProvider;
  txHash: Hex;
  vm: 'EVM' | 'AVM' | 'PVM';
  onTransactionPending: ({
    txHash,
    request,
    explorerLink,
  }: {
    txHash: Hex;
    request: RpcRequest;
    explorerLink: string;
  }) => void;
  onTransactionConfirmed: ({
    txHash,
    explorerLink,
    request,
  }: {
    txHash: Hex;
    explorerLink: string;
    request: RpcRequest;
  }) => void;
  onTransactionReverted: ({ txHash, request }: { txHash: Hex; request: RpcRequest }) => void;
  request: RpcRequest;
}) => {
  const maxTransactionStatusCheckRetries = 7;

  const explorerLink = getExplorerAddressByNetwork(explorerUrl, txHash);

  try {
    onTransactionPending({ txHash, request, explorerLink });

    if (vm === PVM) {
      // https://docs.avax.network/api-reference/p-chain/api#platformgettxstatus
      const result = await retry({
        operation: () => provider.getApiP().getTxStatus({ txID: txHash }),
        isSuccess: (result) => ['Committed', 'Dropped'].includes(result.status),
        maxRetries: maxTransactionStatusCheckRetries,
      });

      if (result.status === 'Committed') {
        onTransactionConfirmed({ txHash, explorerLink, request });
      } else {
        onTransactionReverted({ txHash, request });
      }
    } else if (vm === AVM) {
      // https://docs.avax.network/api-reference/x-chain/api#avmgettxstatus
      const result = await retry({
        operation: () => provider.getApiX().getTxStatus({ txID: txHash }),
        isSuccess: (result) => ['Accepted', 'Rejected'].includes(result.status),
        maxRetries: maxTransactionStatusCheckRetries,
      });

      if (result.status === 'Accepted') {
        onTransactionConfirmed({ txHash, explorerLink, request });
      } else {
        onTransactionReverted({ txHash, request });
      }
    } else {
      // https://docs.avax.network/api-reference/c-chain/api#avaxgetatomictxstatus
      const result = await retry({
        operation: () => provider.getApiC().getAtomicTxStatus(txHash),
        isSuccess: (result) => ['Accepted', 'Dropped'].includes(result.status),
        maxRetries: maxTransactionStatusCheckRetries,
      });

      if (result.status === 'Accepted') {
        onTransactionConfirmed({ txHash, explorerLink, request });
      } else {
        onTransactionReverted({ txHash, request });
      }
    }
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message.startsWith('Max retry exceeded.')) {
      // in the future, we may want to handle this timeout situation differently
    } else {
      onTransactionReverted({ txHash, request });
    }
  }
};
