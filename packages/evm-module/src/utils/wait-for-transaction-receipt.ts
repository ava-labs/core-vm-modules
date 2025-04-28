import type { Hex } from '@avalabs/vm-module-types';
import type { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';
import { getExplorerAddressByNetwork } from '@src/handlers/get-transaction-history/utils/get-explorer-address-by-network';

export const waitForTransactionReceipt = async ({
  explorerUrl,
  provider,
  txHash,
  onTransactionPending,
  onTransactionConfirmed,
  onTransactionReverted,
  requestId,
}: {
  explorerUrl: string;
  provider: JsonRpcBatchInternal;
  txHash: Hex;
  onTransactionPending: ({ txHash, requestId }: { txHash: Hex; requestId: string }) => void;
  onTransactionConfirmed: ({
    txHash,
    explorerLink,
    requestId,
  }: {
    txHash: Hex;
    explorerLink: string;
    requestId: string;
  }) => void;
  onTransactionReverted: ({ txHash, requestId }: { txHash: Hex; requestId: string }) => void;
  requestId: string;
}) => {
  try {
    onTransactionPending({ txHash, requestId });

    const receipt = await provider.waitForTransaction(txHash);

    const success = receipt?.status === 1; // 1 indicates success, 0 indicates revert

    const explorerLink = getExplorerAddressByNetwork(explorerUrl, txHash);

    if (success) {
      onTransactionConfirmed({ txHash, explorerLink, requestId });
      return true;
    }
  } catch (error) {
    console.error(error);
  }

  onTransactionReverted({ txHash, requestId });

  return false;
};
