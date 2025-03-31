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

import { dataItem } from '@internal/utils/src/utils/detail-item';

import { getProvider } from '@src/utils/get-provider';
import { simulateTransaction } from '@src/utils/scan-solana-transaction';
import { getNetworkName } from '@src/utils/get-network-name';
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

  const { details, isSimulationSuccessful, alert, balanceChange } = await simulateTransaction({
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
    title: 'Approve Transaction',
    network: {
      chainId: network.chainId,
      name: network.chainName,
      logoUri: network.logoUri,
    },
    details: [
      {
        title: 'Transaction Details',
        items: [dataItem('Raw Data', serializedTx)],
      },
      ...details,
    ],
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
  } catch (error) {
    console.error(error);
    return {
      error: rpcErrors.internal({ message: 'Unable to get transaction hash', data: { cause: error } }),
    };
  }

  return {
    result: txHash,
  };
};

const getTxHash = async (
  provider: ReturnType<typeof getProvider>,
  response: SigningResult,
  sendOptions?: SendOptions,
) => {
  if ('txHash' in response) {
    return response.txHash;
  }

  // broadcast the signed transaction
  const txHash = await provider
    .sendTransaction(response.signedData as Base64EncodedWireTransaction, {
      ...sendOptions,
      encoding: 'base64',
    })
    .send();
  return txHash;
};
