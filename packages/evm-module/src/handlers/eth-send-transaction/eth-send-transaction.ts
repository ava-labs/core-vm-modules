import { type Network, type RpcRequest, type ApprovalController } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';

import { getNonce } from '../../utils/get-nonce';
import { getProvider } from '../../utils/get-provider';
import { getTxUpdater } from '../../utils/evm-tx-updater';
import { estimateGasLimit } from '../../utils/estimate-gas-limit';
import { buildTxApprovalRequest } from '../../utils/build-tx-approval-request';
import { simulateTransaction } from '../../utils/process-transaction-simulation';
import { rpcErrorOpts } from '@internal/utils';

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
      error: rpcErrors.invalidParams(rpcErrorOpts('Transaction params are invalid', error)),
    };
  }

  const [transaction] = data;

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
        error: rpcErrors.internal(rpcErrorOpts('Unable to calculate gas limit', error)),
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
        error: rpcErrors.internal(rpcErrorOpts('Unable to calculate nonce', error)),
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

  // Read shouldRetry AFTER approval, so mutations during approval flow are respected
  const shouldRetry = request.context?.shouldRetry === true;

  try {
    txHash = await getTxHash(provider, response, { shouldRetry });
  } catch (error) {
    return {
      error: rpcErrors.internal(rpcErrorOpts('Unable to get transaction hash', error)),
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
