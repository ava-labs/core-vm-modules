import type { ApprovalController, Network, RpcRequest } from '@avalabs/vm-module-types';
import type { getProvider } from './get-provider';
import { signature } from '@solana/kit';
import { getExplorerAddressByNetwork } from './get-explorer-address-by-network';

const POLLING_INTERVAL = 1000; // 1 second
const MAX_RETRIES = 60; // 1 minute total

export type WaitForTransactionConfirmationParams = {
  provider: ReturnType<typeof getProvider>;
  txHash: string;
  approvalController: ApprovalController;
  request: RpcRequest;
  network: Network;
  commitment?: 'processed' | 'confirmed' | 'finalized';
  maxRetries?: number;
};

export const waitForTransactionConfirmation = async ({
  provider,
  txHash,
  approvalController,
  request,
  network,
  commitment = 'finalized',
  maxRetries = MAX_RETRIES,
}: WaitForTransactionConfirmationParams): Promise<boolean> => {
  let retries = 0;
  let lastStatus: string | null = null;
  const explorerLink = getExplorerAddressByNetwork(network, txHash, 'tx');

  while (retries < maxRetries) {
    try {
      const response = await provider
        .getSignatureStatuses([signature(txHash)], { searchTransactionHistory: true })
        .send();

      if (!response?.value?.[0]) {
        await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
        retries++;
        continue;
      }

      const { confirmationStatus, err } = response.value[0];

      if (err) {
        console.error('[waitForTransactionConfirmation] Transaction failed:', err);
        approvalController.onTransactionReverted({ txHash, request });
        return false;
      }

      if (confirmationStatus && confirmationStatus !== lastStatus) {
        lastStatus = confirmationStatus;

        if (confirmationStatus === 'processed') {
          approvalController.onTransactionPending({ txHash, request });
        }

        const isConfirmed =
          (commitment === 'processed' && confirmationStatus === 'processed') ||
          (commitment === 'confirmed' && ['confirmed', 'finalized'].includes(confirmationStatus)) ||
          (commitment === 'finalized' && confirmationStatus === 'finalized');

        if (isConfirmed) {
          approvalController.onTransactionConfirmed({ txHash, request, explorerLink });
          return true;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
      retries++;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Transaction failed')) {
        console.error('[waitForTransactionConfirmation] Transaction explicitly failed');
        approvalController.onTransactionReverted({ txHash, request });
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
      retries++;
    }
  }

  // If we reach max retries but had a valid status, don't mark as reverted
  if (lastStatus === 'confirmed' || lastStatus === 'finalized') {
    approvalController.onTransactionConfirmed({ txHash, request, explorerLink });
    return true;
  }

  approvalController.onTransactionReverted({ txHash, request });
  return false;
};
