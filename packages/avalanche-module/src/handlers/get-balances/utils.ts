import type { PChainBalance, XChainBalances } from '@avalabs/glacier-sdk';

export const isPchainBalance = (balanceResult: PChainBalance | XChainBalances): balanceResult is PChainBalance => {
  return Object.keys(balanceResult).includes('unlockedUnstaked');
};

export const isXchainBalance = (balanceResult: PChainBalance | XChainBalances): balanceResult is XChainBalances => {
  return Object.keys(balanceResult).includes('locked');
};

export function calculateTotalBalance(uxtos: PChainBalance | XChainBalances): bigint {
  const sum = Object.values(uxtos).reduce(function (totalAcc, utxoList) {
    const typeSum = utxoList.reduce(function (typeAcc, utxo) {
      const balanceToAdd = Number(utxo.amount);
      return typeAcc + balanceToAdd;
    }, 0);

    return totalAcc + typeSum;
  }, 0);

  return BigInt(sum);
}
