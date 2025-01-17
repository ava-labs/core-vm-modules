import {
  type Network,
  type RpcRequest,
  type DisplayData,
  type BatchApprovalController,
  type Hex,
} from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';

import { getProvider } from '../../utils/get-provider';

import { parseRequestParams } from './schema';
import { ensureProperNonces } from './utils/ensure-proper-nonces';
import { buildTxApprovalRequest } from '../../utils/build-tx-approval-request';
import { getTxHash } from '../../utils/get-tx-hash';
import { waitForTransactionReceipt } from '../../utils/wait-for-transaction-receipt';
import { getTxBatchUpdater } from '../../utils/evm-tx-batch-updater';
import { simulateTransactionBatch } from './utils/process-transaction-batch-simulation';
import { addressItem, linkItem } from '@internal/utils/src/utils/detail-item';

export const ethSendTransactionBatch = async ({
  request,
  network,
  approvalController,
  proxyApiUrl,
}: {
  request: RpcRequest;
  network: Network;
  approvalController: BatchApprovalController;
  proxyApiUrl: string;
}) => {
  const { params } = request;
  const { data: transactionRequests, success, error } = parseRequestParams(params);

  if (!success) {
    console.error('invalid params', error);
    return {
      error: rpcErrors.invalidParams({ message: 'Transaction params are invalid', data: { cause: error } }),
    };
  }

  const provider = await getProvider({
    chainId: network.chainId,
    chainName: network.chainName,
    rpcUrl: network.rpcUrl,
    multiContractAddress: network.utilityAddresses?.multicall,
    pollingInterval: 1000,
  });

  // Ensure all transactions in the batch have the nonce set
  try {
    await ensureProperNonces(transactionRequests, provider);
  } catch (error) {
    console.error('Unable to calculate nonce', error);
    return {
      error: rpcErrors.internal({
        message: 'Unable to calculate nonce',
        data: {
          originalError: error,
        },
      }),
    };
  }

  const allTransactionPayloadsHaveGas = transactionRequests.every((tx) => Number(tx.gas) > 0);
  const { alert, balanceChange, isSimulationSuccessful, tokenApprovals, scans } = await simulateTransactionBatch({
    rpcMethod: request.method,
    proxyApiUrl,
    chainId: network.chainId,
    params: transactionRequests,
    dAppUrl: request.dappInfo.url,
    provider,
    populateMissingGas: !allTransactionPayloadsHaveGas,
  });
  const allTransactionsHaveGas = scans.every(({ transaction }) => Number(transaction.gas) > 0);

  if (!allTransactionsHaveGas) {
    console.error('Gas limit is missing in some transactions');
    return {
      error: rpcErrors.internal({
        message: 'Gas limit is missing in some transactions',
      }),
    };
  }

  const displayData: DisplayData = {
    title: 'Approve Transaction Batch',
    details: [
      {
        title: 'Transaction Details',
        items: [linkItem('Website', request.dappInfo), addressItem('From', transactionRequests[0].from)],
      },
    ],
    network: {
      chainId: network.chainId,
      name: network.chainName,
      logoUri: network.logoUri,
    },
    isSimulationSuccessful,
    balanceChange,
    alert,
    tokenApprovals,
    networkFeeSelector: true,
  };

  const signingRequests = scans.map((scan) => buildTxApprovalRequest(request, network, scan.transaction, scan));
  const { cleanup, updateTx } = getTxBatchUpdater(request.requestId, signingRequests, displayData);

  const response = await approvalController.requestBatchApproval({ request, signingRequests, displayData, updateTx });

  cleanup();

  if ('error' in response) {
    return {
      error: response.error,
    };
  }

  if (response.result.length !== transactionRequests.length) {
    return {
      error: rpcErrors.internal({
        message: `Invalid number of signatures. Expected ${transactionRequests.length}, got ${response.result.length}`,
      }),
    };
  }

  const txHashes: Hex[] = [];

  for (const [index, result] of response.result.entries()) {
    const isLast = index === response.result.length - 1;
    // Execute transactions one-by-one, as they may depend on one another
    const txHash = await getTxHash(provider, result);

    const receiptPromise = waitForTransactionReceipt({
      provider,
      txHash,
      onTransactionConfirmed: approvalController.onTransactionConfirmed,
      onTransactionReverted: approvalController.onTransactionReverted,
      requestId: request.requestId,
    });

    // If it's the last transaction, we don't need to await the receipt, as there
    // are no more transactions in the batch that would rely on it.
    //
    // Also, for most of our use cases, batches will only have 2 transactions,
    // so skipping the receipt for the last one will let us send the response
    // to the client significantly faster, making the UX better.
    if (!isLast) {
      const isSuccess = await receiptPromise;

      if (!isSuccess) {
        return {
          error: rpcErrors.internal({
            message: `Transaction ${index + 1} failed! Batch execution stopped`,
          }),
        };
      }
    }

    txHashes.push(txHash);
  }

  return {
    result: txHashes,
  };
};
