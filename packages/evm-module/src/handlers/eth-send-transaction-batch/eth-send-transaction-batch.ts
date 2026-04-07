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
import { addressItem, linkItem, networkItem } from '@internal/utils/src/utils/detail-item';
import { rpcErrorOpts } from '@internal/utils';
import type Blockaid from '@blockaid/client';

export const ethSendTransactionBatch = async ({
  request,
  network,
  approvalController,
  blockaid,
}: {
  request: RpcRequest;
  network: Network;
  approvalController: BatchApprovalController;
  blockaid: Blockaid;
}) => {
  const { params } = request;
  const { data: parsedParams, success, error } = parseRequestParams(params);

  if (!success) {
    console.error('invalid params', error);
    return {
      error: rpcErrors.invalidParams(rpcErrorOpts('Transaction params are invalid', error)),
    };
  }

  const { transactions: transactionRequests, options = {} } = parsedParams;
  const { skipIntermediateTxs = false } = options;

  const provider = await getProvider({
    chainId: network.chainId,
    chainName: network.chainName,
    rpcUrl: network.rpcUrl,
    multiContractAddress: network.utilityAddresses?.multicall,
    pollingInterval: 1000,
    customRpcHeaders: network.customRpcHeaders,
  });

  // Ensure all transactions in the batch have the nonce set
  try {
    await ensureProperNonces(transactionRequests, provider);
  } catch (error) {
    console.error('Unable to calculate nonce', error);
    return {
      error: rpcErrors.internal(rpcErrorOpts('Unable to calculate nonce', error)),
    };
  }

  const allTransactionPayloadsHaveGas = transactionRequests.every((tx) => Number(tx.gas) > 0);
  const { alert, balanceChange, isSimulationSuccessful, tokenApprovals, scans } = await simulateTransactionBatch({
    rpcMethod: request.method,
    chainId: network.chainId,
    params: transactionRequests,
    dAppUrl: request.dappInfo.url,
    provider,
    populateMissingGas: !allTransactionPayloadsHaveGas,
    blockaid,
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
    title: 'Do you approve these transactions?',
    details: [
      {
        title: 'Transaction Details',
        items: [
          addressItem('Account', transactionRequests[0].from),
          networkItem('Network', {
            name: network.chainName,
            logoUri: network.logoUri,
          }),
          linkItem('Website', request.dappInfo),
        ],
      },
    ],
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
    const txHash = await getTxHash(provider, result);

    // For the last tx: fire-and-forget receipt tracking (for UI callbacks)
    if (isLast) {
      waitForTransactionReceipt({
        explorerUrl: network.explorerUrl ?? '',
        provider,
        txHash,
        onTransactionPending: approvalController.onTransactionPending,
        onTransactionConfirmed: approvalController.onTransactionConfirmed,
        onTransactionReverted: approvalController.onTransactionReverted,
        request,
      });
    }

    // For intermediate txs: wait for receipt before broadcasting next (unless skipIntermediateTxs)
    if (!isLast && !skipIntermediateTxs) {
      const isSuccess = await waitForTransactionReceipt({
        explorerUrl: network.explorerUrl ?? '',
        provider,
        txHash,
        onTransactionPending: approvalController.onTransactionPending,
        onTransactionConfirmed: approvalController.onTransactionConfirmed,
        onTransactionReverted: approvalController.onTransactionReverted,
        request,
      });

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
