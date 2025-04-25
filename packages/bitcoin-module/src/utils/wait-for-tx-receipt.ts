import type { Hex } from '@avalabs/vm-module-types';
import type { BitcoinProvider } from '@avalabs/core-wallets-sdk';

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
  provider: BitcoinProvider;
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
    await provider.waitForTx(txHash);
    const explorerLink = `${explorerUrl}/tx/${txHash}`;
    onTransactionConfirmed({ txHash, explorerLink, requestId });
  } catch (err) {
    console.error(err);
    onTransactionReverted({ txHash, requestId });
  }
};
