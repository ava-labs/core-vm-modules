import { type Network, type RpcRequest, type ApprovalController } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';

import { getNonce } from '../../utils/get-nonce';
import { getProvider } from '../../utils/get-provider';
import { getTxUpdater } from '../../utils/evm-tx-updater';
import { estimateGasLimit } from '../../utils/estimate-gas-limit';
import { buildTxApprovalRequest } from '../../utils/build-tx-approval-request';
import { simulateTransaction } from '../../utils/process-transaction-simulation';

import { parseRequestParams } from './schema';
import { waitForTransactionReceipt } from '../../utils/wait-for-transaction-receipt';
import { getTxHash } from '../../utils/get-tx-hash';
import type Blockaid from '@blockaid/client';

export const ethSendTransaction = async ({
  request,
  network,
  approvalController,
  blockaid,
}: {
  request: RpcRequest;
  network: Network;
  approvalController: ApprovalController;
  blockaid: Blockaid;
}) => {
  const { params } = request;

  // validate params
  const { data, error, success } = parseRequestParams(params);

  if (!success) {
    console.error('invalid params', error);
    return {
      error: rpcErrors.invalidParams({ message: 'Transaction params are invalid', data: { cause: error } }),
    };
  }

  const [transaction] = data;
  const shouldRetry = request.context?.shouldRetry === true;

  const provider = await getProvider({
    chainId: network.chainId,
    chainName: network.chainName,
    rpcUrl: network.rpcUrl,
    multiContractAddress: network.utilityAddresses?.multicall,
    pollingInterval: 1000,
  });

  // calculate gas limit if not provided/invalid
  if (!transaction.gas || Number(transaction.gas) < 0) {
    try {
      const gasLimit = await estimateGasLimit({
        transactionParams: {
          from: transaction.from,
          to: transaction.to,
          data: transaction.data,
          value: transaction.value,
          accessList: transaction.accessList,
        },
        provider,
      });

      transaction.gas = '0x' + gasLimit.toString(16);
    } catch (error) {
      return {
        error: rpcErrors.internal('Unable to calculate gas limit'),
      };
    }
  }

  // calculate nonce if not provided
  if (!transaction.nonce) {
    try {
      const nonce = await getNonce({
        from: transaction.from,
        provider,
      });
      transaction.nonce = String(nonce);
    } catch (error) {
      return {
        error: rpcErrors.internal('Unable to calculate nonce'),
      };
    }
  }

  const scan = await simulateTransaction({
    rpcMethod: request.method,
    chainId: network.chainId,
    params: transaction,
    dAppUrl: request.dappInfo.url,
    provider,
    blockaid,
  });

  const { displayData, signingData } = buildTxApprovalRequest(request, network, transaction, scan);

  const { updateTx, cleanup } = getTxUpdater(request.requestId, signingData, displayData);
  // prompt user for approval
  const response = await approvalController.requestApproval({ request, displayData, signingData, updateTx });

  cleanup();

  if ('error' in response) {
    return {
      error: response.error,
    };
  }

  let txHash;

  try {
    txHash = await getTxHash(provider, response, { shouldRetry });
  } catch (error) {
    return {
      error: rpcErrors.internal({ message: 'Unable to get transaction hash', data: { cause: error } }),
    };
  }

  waitForTransactionReceipt({
    explorerUrl: network.explorerUrl ?? '',
    provider,
    txHash,
    onTransactionPending: approvalController.onTransactionPending,
    onTransactionConfirmed: approvalController.onTransactionConfirmed,
    onTransactionReverted: approvalController.onTransactionReverted,
    request,
  });

  return { result: txHash };
};
