import type { TokenWithBalance, TokenWithBalanceBTC } from '@avalabs/vm-module-types';

export const isBtcBalance = (balance?: TokenWithBalance): balance is TokenWithBalanceBTC => {
  if (!balance) {
    return false;
  }

  const hasUtxos = 'utxos' in balance; // BTC, P-Chain or X-Chain
  const hasLocked = 'locked' in balance; // X-Chain only
  const hasUnlockedUnstaked = 'unlockedUnstaked' in balance; // P-Chain only

  return hasUtxos && !hasUnlockedUnstaked && !hasLocked;
};
