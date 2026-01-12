import type { Hex, RpcRequest } from '@avalabs/vm-module-types';
import type { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';
import { getExplorerAddressByNetwork } from '../handlers/get-transaction-history/utils/get-explorer-address-by-network';
import type { TransactionReceipt } from 'ethers';
import { retry, RetryBackoffPolicy } from '@internal/utils';

export const waitForTransactionReceipt = async ({
  explorerUrl,
  provider,
  txHash,
  onTransactionPending,
  onTransactionConfirmed,
  onTransactionReverted,
  request,
}: {
  explorerUrl: string;
  provider: JsonRpcBatchInternal;
  txHash: Hex;
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
  try {
    const explorerLink = getExplorerAddressByNetwork(explorerUrl, txHash);
    onTransactionPending({ txHash, request, explorerLink });

    const receipt = await retry<TransactionReceipt | null>({
      operation: async () => provider.getTransactionReceipt(txHash),
      isSuccess: (r): r is TransactionReceipt => !!r, // success when receipt is present (>= 1 confirmation)
      backoffPolicy: RetryBackoffPolicy.linearThenExponential(15, 750),
      maxRetries: 20,
    });

    const success = receipt?.status === 1; // 1 indicates success, 0 indicates revert

    if (success) {
      onTransactionConfirmed({ txHash, explorerLink, request });
      return true;
    }
  } catch (error) {
    console.error(error);
  }

  onTransactionReverted({ txHash, request });

  return false;
};
