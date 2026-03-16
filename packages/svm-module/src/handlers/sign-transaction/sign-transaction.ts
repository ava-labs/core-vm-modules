import { rpcErrors } from '@metamask/rpc-errors';
import {
  RpcMethod,
  type ApprovalController,
  type DisplayData,
  type Network,
  type RpcRequest,
  type SigningData,
} from '@avalabs/vm-module-types';

import { getProvider } from '@src/utils/get-provider';
import { isBalanceChangeEmpty } from '@src/utils/functional';
import { getNetworkName } from '@src/utils/get-network-name';
import { explainTransaction } from '@src/utils/explain/explain-transaction';

import { parseRequestParams } from './schema';
import type Blockaid from '@blockaid/client';
import { rpcErrorOpts } from '@internal/utils';

export const signTransaction = async ({
  request,
  network,
  approvalController,
  proxyApiUrl,
  blockaid,
}: {
  request: RpcRequest;
  network: Network;
  approvalController: ApprovalController;
  proxyApiUrl: string;
  blockaid: Blockaid;
}) => {
  const { params } = request;
  const { data, success, error } = parseRequestParams(params);

  if (!success) {
    console.error('invalid params', error);
    return {
      error: rpcErrors.invalidParams(rpcErrorOpts('Transaction params are invalid', error)),
    };
  }

  const [{ account, serializedTx }] = data;

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
      blockaid,
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
    balanceChange: balanceChange && isBalanceChangeEmpty(balanceChange) ? undefined : balanceChange,
    networkFeeSelector: false,
    isSimulationSuccessful,
  };

  const signingData: SigningData = {
    type: RpcMethod.SOLANA_SIGN_TRANSACTION,
    account,
    data: serializedTx,
  };

  const response = await approvalController.requestApproval({ request, displayData, signingData });

  if ('error' in response) {
    return {
      error: response.error,
    };
  }

  if (!('signedData' in response)) {
    return {
      error: rpcErrors.invalidRequest('No signed data returned'),
    };
  }

  return { result: response.signedData };
};
