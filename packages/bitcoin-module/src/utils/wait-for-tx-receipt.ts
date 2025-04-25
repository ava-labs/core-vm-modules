import type { Hex } from '@avalabs/vm-module-types';
import type { BitcoinProvider } from '@avalabs/core-wallets-sdk';

export const waitForTransactionReceipt = async ({
  explorerUrl,
  provider,
  txHash,
  onTransactionConfirmed,
  onTransactionReverted,
  requestId,
}: {
  explorerUrl: string;
  provider: BitcoinProvider;
  txHash: Hex;
  onTransactionConfirmed: ({ explorerLink, requestId }: { explorerLink: string; requestId: string }) => void;
  onTransactionReverted: (txHash: Hex, requestId: string) => void;
  requestId: string;
}) => {
  try {
    await provider.waitForTx(txHash);
    const explorerLink = `${explorerUrl}/tx/${txHash}`;
    onTransactionConfirmed({ explorerLink, requestId });
  } catch (err) {
    console.error(err);
    onTransactionReverted(txHash, requestId);
  }
};
