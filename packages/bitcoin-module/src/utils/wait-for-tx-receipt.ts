import type { Hex } from '@avalabs/vm-module-types';
import type { BitcoinProvider } from '@avalabs/core-wallets-sdk';

export const waitForTransactionReceipt = async ({
  provider,
  txHash,
  onTransactionConfirmed,
  onTransactionReverted,
  requestId,
}: {
  provider: BitcoinProvider;
  txHash: Hex;
  onTransactionConfirmed: (txHash: Hex, requestId: string) => void;
  onTransactionReverted: (txHash: Hex, requestId: string) => void;
  requestId: string;
}) => {
  try {
    await provider.waitForTx(txHash);
    onTransactionConfirmed(txHash, requestId);
  } catch (err) {
    console.error(err);
    onTransactionReverted(txHash, requestId);
  }
};
