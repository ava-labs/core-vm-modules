import type { ApprovalController, RpcRequest } from '@avalabs/vm-module-types';
import type { getProvider } from './get-provider';
import { signature } from '@solana/kit';
import { base58 } from '@scure/base';

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
  commitment = 'finalized',
  maxRetries = MAX_RETRIES,
}: WaitForTransactionConfirmationParams): Promise<boolean> => {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const response = await provider
        .getSignatureStatuses([signature(txHash)], { searchTransactionHistory: true })
        .send();

      if (!response?.value) {
        // Transaction not found yet, keep polling
        await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
        retries++;
        continue;
      }

      const status = response.value[0];
      if (!status) {
        // Transaction not found yet, keep polling
        await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
        retries++;
        continue;
      }

      const { confirmationStatus, err } = status;

      if (err) {
        await approvalController.onTransactionReverted({ txHash, request });
        return false;
      }

      // Convert hex back to base58 for explorer URL
      const base58TxHash = base58.encode(Buffer.from(txHash.slice(2), 'hex'));
      const explorerLink = `https://explorer.solana.com/tx/${base58TxHash}`;

      // Handle different confirmation statuses
      switch (confirmationStatus) {
        case 'processed':
          if (commitment === 'processed') {
            await approvalController.onTransactionConfirmed({
              txHash,
              request,
              explorerLink,
            });
            return true;
          }
          break;

        case 'confirmed':
          if (commitment === 'confirmed') {
            await approvalController.onTransactionConfirmed({
              txHash,
              request,
              explorerLink,
            });
            return true;
          }
          break;

        case 'finalized':
          await approvalController.onTransactionConfirmed({
            txHash,
            request,
            explorerLink,
          });
          return true;

        default:
          // Unknown status, keep polling
          break;
      }

      await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
      retries++;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Transaction failed')) {
        await approvalController.onTransactionReverted({ txHash, request });
        return false;
      }
      // For other errors (network etc), keep polling
      await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
      retries++;
    }
  }

  // If we reach here, we've exceeded max retries
  await approvalController.onTransactionReverted({ txHash, request });
  return false;
};
