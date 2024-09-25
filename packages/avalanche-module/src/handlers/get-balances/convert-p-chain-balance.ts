import type { AggregatedAssetAmount, PChainBalance } from '@avalabs/glacier-sdk';
import { TokenUnit } from '@avalabs/core-utils-sdk';
import { calculateTotalBalance } from './utils';
import { type NetworkToken, TokenType, type TokenWithBalancePVM } from '@avalabs/vm-module-types';

export const convertPChainBalance = ({
  balance,
  networkToken,
  priceInCurrency,
  marketCap,
  vol24,
  change24,
  coingeckoId,
}: {
  balance: PChainBalance;
  networkToken: NetworkToken;
  priceInCurrency?: number;
  marketCap?: number;
  vol24?: number;
  change24?: number;
  coingeckoId: string;
}): TokenWithBalancePVM => {
  const balancePerType: Record<string, bigint> = {};

  const balanceTypes: Record<string, AggregatedAssetAmount[]> = {
    unlockedUnstaked: balance.unlockedUnstaked,
    unlockedStaked: balance.unlockedStaked,
    pendingStaked: balance.pendingStaked,
    lockedStaked: balance.lockedStaked,
    lockedStakeable: balance.lockedStakeable,
    lockedPlatform: balance.lockedPlatform,
    atomicMemoryLocked: balance.atomicMemoryLocked,
    atomicMemoryUnlocked: balance.atomicMemoryUnlocked,
  };

  for (const balanceType in balanceTypes) {
    const balancesToAdd = balanceTypes[balanceType];
    if (!balancesToAdd || !balancesToAdd.length) {
      balancePerType[balanceType] = 0n;
      continue;
    }

    balancesToAdd.forEach((uxto: AggregatedAssetAmount) => {
      const previousBalance = balancePerType[balanceType] ?? 0n;
      const newBalance = previousBalance + BigInt(uxto.amount);
      balancePerType[balanceType] = newBalance;
    });
  }

  const available = new TokenUnit(
    balancePerType['unlockedUnstaked'] ? balancePerType['unlockedUnstaked'] : 0n,
    networkToken.decimals,
    networkToken.symbol,
  );
  const availableInCurrency = priceInCurrency
    ? available.mul(priceInCurrency).toDisplay({ fixedDp: 2, asNumber: true })
    : undefined;
  const totalBalance = new TokenUnit(calculateTotalBalance(balance), networkToken.decimals, networkToken.symbol);
  const balanceInCurrency = priceInCurrency
    ? totalBalance.mul(priceInCurrency).toDisplay({ fixedDp: 2, asNumber: true })
    : undefined;

  return {
    ...networkToken,
    type: TokenType.NATIVE,
    priceInCurrency,
    balance: totalBalance.toSubUnit(),
    balanceInCurrency,
    balanceDisplayValue: totalBalance.toDisplay(),
    balanceCurrencyDisplayValue: balanceInCurrency?.toFixed(2),
    available: available.toSubUnit(),
    availableInCurrency,
    availableDisplayValue: available.toDisplay(),
    availableCurrencyDisplayValue: availableInCurrency?.toFixed(2),
    utxos: balance,
    balancePerType: {
      lockedStaked: balancePerType['lockedStaked'],
      lockedStakeable: balancePerType['lockedStakeable'],
      lockedPlatform: balancePerType['lockedPlatform'],
      atomicMemoryLocked: balancePerType['atomicMemoryLocked'],
      atomicMemoryUnlocked: balancePerType['atomicMemoryUnlocked'],
      unlockedUnstaked: balancePerType['unlockedUnstaked'],
      unlockedStaked: balancePerType['unlockedStaked'],
      pendingStaked: balancePerType['pendingStaked'],
    },
    marketCap,
    vol24,
    change24,
    coingeckoId,
  };
};
