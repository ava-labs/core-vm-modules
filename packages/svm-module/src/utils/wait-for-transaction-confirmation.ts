import type { ApprovalController, RpcRequest } from '@avalabs/vm-module-types';
import type { getProvider } from './get-provider';
import { signature } from '@solana/kit';
import { toBase58TxHash } from './format-transaction-hash';

const POLLING_INTERVAL = 1000; // 1 second
const MAX_RETRIES = 60; // 1 minute total

export type WaitForTransactionConfirmationParams = {
  provider: ReturnType<typeof getProvider>;
  txHash: `0x${string}`;
  approvalController: ApprovalController;
  request: RpcRequest;
  commitment?: 'processed' | 'confirmed' | 'finalized';
  maxRetries?: number;
};

export const waitForTransactionConfirmation = async ({
  provider,
  txHash,
  approvalController,
  request,
  commitment = 'confirmed',
  maxRetries = MAX_RETRIES,
}: WaitForTransactionConfirmationParams): Promise<boolean> => {
  let retries = 0;
  let lastStatus: string | null = null;

  while (retries < maxRetries) {
    try {
      const response = await provider
        .getSignatureStatuses([signature(txHash)], { searchTransactionHistory: true })
        .send();

      if (!response?.value?.[0]) {
        // Transaction not found yet, keep polling
        await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
        retries++;
        continue;
      }

      const status = response.value[0];
      const { confirmationStatus, err } = status;

      if (err) {
        approvalController.onTransactionReverted({ txHash, request });
        return false;
      }

      // Only update UI for status changes
      if (confirmationStatus && confirmationStatus !== lastStatus) {
        lastStatus = confirmationStatus;

        // Convert hex back to base58 for explorer URL
        const explorerLink = `https://explorer.solana.com/tx/${toBase58TxHash(txHash)}`;

        // Show pending for processed state
        if (confirmationStatus === 'processed') {
          approvalController.onTransactionPending({ txHash, request });
        }

        // Confirm when we reach target commitment level
        if (
          (commitment === 'processed' && confirmationStatus === 'processed') ||
          (commitment === 'confirmed' && ['confirmed', 'finalized'].includes(confirmationStatus)) ||
          (commitment === 'finalized' && confirmationStatus === 'finalized')
        ) {
          approvalController.onTransactionConfirmed({
            txHash,
            request,
            explorerLink,
          });
          return true;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
      retries++;
    } catch (error) {
      // Only revert on explicit transaction failure
      if (error instanceof Error && error.message.includes('Transaction failed')) {
        approvalController.onTransactionReverted({ txHash, request });
        return false;
      }
      // For other errors, keep polling
      await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
      retries++;
    }
  }

  // If we reach max retries but had a valid status, don't mark as reverted
  if (lastStatus === 'confirmed' || lastStatus === 'finalized') {
    const explorerLink = `https://explorer.solana.com/tx/${toBase58TxHash(txHash)}`;
    approvalController.onTransactionConfirmed({
      txHash,
      request,
      explorerLink,
    });
    return true;
  }

  // Only revert if we never got a valid status
  approvalController.onTransactionReverted({ txHash, request });
  return false;
};
