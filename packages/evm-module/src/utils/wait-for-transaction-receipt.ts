import type { Hex } from '@avalabs/vm-module-types';
import type { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';

export const waitForTransactionReceipt = async ({
  provider,
  txHash,
  onTransactionConfirmed,
  onTransactionReverted,
  requestId,
}: {
  provider: JsonRpcBatchInternal;
  txHash: Hex;
  onTransactionConfirmed: (txHash: Hex, requestId: string) => void;
  onTransactionReverted: (txHash: Hex, requestId: string) => void;
  requestId: string;
}) => {
  try {
    const receipt = await provider.waitForTransaction(txHash);

    const success = receipt?.status === 1; // 1 indicates success, 0 indicates revert

    if (success) {
      onTransactionConfirmed(txHash, requestId);
      return true;
    }
  } catch (error) {
    console.error(error);
  }

  onTransactionReverted(txHash, requestId);

  return false;
};
