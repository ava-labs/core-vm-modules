import type {
  AggregatedAssetAmount,
  PChainBalance,
  PChainSharedAsset,
  XChainBalances,
  XChainSharedAssetBalance,
} from '@avalabs/glacier-sdk';

export const isPchainBalance = (balanceResult: PChainBalance | XChainBalances): balanceResult is PChainBalance => {
  return Object.keys(balanceResult).includes('unlockedUnstaked');
};

export const isXchainBalance = (balanceResult: PChainBalance | XChainBalances): balanceResult is XChainBalances => {
  return Object.keys(balanceResult).includes('locked');
};

type BalanceAsset = AggregatedAssetAmount | PChainSharedAsset | XChainSharedAssetBalance;

const sumAvaxFromAssets = (assets: BalanceAsset[] | undefined, avaxAssetId: string): bigint => {
  if (!assets?.length) {
    return 0n;
  }

  return assets.reduce((total, asset) => {
    if (asset.assetId !== avaxAssetId) {
      return total;
    }

    return total + BigInt(asset.amount);
  }, 0n);
};

export function calculateAvaxTotalBalance(balances: PChainBalance | XChainBalances, avaxAssetId: string): bigint {
  if (isPchainBalance(balances)) {
    const balanceArrays = [
      ...(balances.unlockedUnstaked || []),
      ...(balances.unlockedStaked || []),
      ...(balances.pendingStaked || []),
      ...(balances.lockedStaked || []),
      ...(balances.lockedStakeable || []),
      ...(balances.lockedPlatform || []),
      ...(balances.atomicMemoryLocked || []),
      ...(balances.atomicMemoryUnlocked || []),
    ];

    const arrayTotal = sumAvaxFromAssets(balanceArrays, avaxAssetId);

    const restakedRewards = balances.restakedRewards ? BigInt(balances.restakedRewards) : 0n;

    return arrayTotal + restakedRewards;
  }

  const balanceArrays = [
    ...(balances.unlocked || []),
    ...(balances.locked || []),
    ...(balances.atomicMemoryUnlocked || []),
    ...(balances.atomicMemoryLocked || []),
  ];

  return sumAvaxFromAssets(balanceArrays, avaxAssetId);
}
