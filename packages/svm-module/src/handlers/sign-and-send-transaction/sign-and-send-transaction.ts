import { rpcErrors } from '@metamask/rpc-errors';
import {
  RpcMethod,
  type ApprovalController,
  type DisplayData,
  type Network,
  type RpcRequest,
  type SigningData,
  type SigningResult,
} from '@avalabs/vm-module-types';
import { type Base64EncodedWireTransaction } from '@solana/kit';

import { getProvider } from '@src/utils/get-provider';
import { getNetworkName } from '@src/utils/get-network-name';
import { explainTransaction } from '@src/utils/explain/explain-transaction';
import { waitForTransactionConfirmation } from '@src/utils/wait-for-transaction-confirmation';

import { parseRequestParams, type SendOptions } from './schema';

export const signAndSendTransaction = async ({
  request,
  network,
  approvalController,
  proxyApiUrl,
}: {
  request: RpcRequest;
  network: Network;
  approvalController: ApprovalController;
  proxyApiUrl: string;
}) => {
  const { params } = request;
  const { data, success, error } = parseRequestParams(params);

  if (!success) {
    console.error('invalid params', error);
    return {
      error: rpcErrors.invalidParams({ message: 'Transaction params are invalid', data: { cause: error } }),
    };
  }

  const [{ account, serializedTx, sendOptions }] = data;

  const provider = getProvider({
    isTestnet: Boolean(network.isTestnet),
    proxyApiUrl,
  });

  const { details, isSimulationSuccessful, alert, balanceChange } = await explainTransaction({
    simulationParams: {
      dAppUrl: request.dappInfo.url,
      params: {
        account,
        chain: getNetworkName(network),
        transactionBase64: serializedTx,
      },
      proxyApiUrl,
    },
    network,
    provider,
  });

  const displayData: DisplayData = {
    title: 'Do you approve this transaction?',
    network: {
      chainId: network.chainId,
      name: network.chainName,
      logoUri: network.logoUri,
    },
    details,
    alert,
    balanceChange,
    networkFeeSelector: false,
    isSimulationSuccessful,
  };

  const signingData: SigningData = {
    type: RpcMethod.SOLANA_SIGN_AND_SEND_TRANSACTION,
    account,
    data: serializedTx,
  };

  const response = await approvalController.requestApproval({ request, displayData, signingData });

  if ('error' in response) {
    return {
      error: response.error,
    };
  }

  let txHash;

  try {
    txHash = await getTxHash(provider, response, sendOptions);
    await approvalController.onTransactionPending({ txHash, request });

    waitForTransactionConfirmation({
      provider,
      txHash,
      approvalController,
      request,
      network,
      commitment: sendOptions?.preflightCommitment,
    });

    return {
      result: txHash,
    };
  } catch (error) {
    console.error(error);
    // Note: we don't need to call onTransactionReverted here as waitForTransactionConfirmation handles that
    return {
      error: rpcErrors.internal({ message: 'Transaction failed', data: { cause: error } }),
    };
  }
};

const getTxHash = async (
  provider: ReturnType<typeof getProvider>,
  response: SigningResult,
  sendOptions?: SendOptions,
) => {
  if ('txHash' in response) {
    return response.txHash;
  }

  const base58TxHash = await provider
    .sendTransaction(response.signedData as Base64EncodedWireTransaction, {
      ...sendOptions,
      encoding: 'base64',
    })
    .send();

  return base58TxHash;
};
