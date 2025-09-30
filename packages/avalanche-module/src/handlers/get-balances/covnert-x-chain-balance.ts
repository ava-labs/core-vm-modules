import type { AggregatedAssetAmount, XChainBalances } from '@avalabs/glacier-sdk';
import { TokenUnit } from '@avalabs/core-utils-sdk';
import { calculateAvaxTotalBalance } from './utils';
import { TokenType, type NetworkToken, type TokenWithBalanceAVM } from '@avalabs/vm-module-types';

export const convertXChainBalance = ({
  balance,
  networkToken,
  priceInCurrency,
  marketCap,
  vol24,
  change24,
  coingeckoId,
  avaxAssetId,
}: {
  balance: XChainBalances;
  networkToken: NetworkToken;
  priceInCurrency?: number;
  marketCap?: number;
  vol24?: number;
  change24?: number;
  coingeckoId: string;
  avaxAssetId: string;
}): TokenWithBalanceAVM => {
  const balancePerType: Record<string, bigint> = {};

  const balanceTypes: Record<string, AggregatedAssetAmount[]> = {
    unlocked: balance.unlocked,
    locked: balance.locked,
    atomicMemoryUnlocked: balance.atomicMemoryUnlocked,
    atomicMemoryLocked: balance.atomicMemoryLocked,
  };

  for (const balanceType in balanceTypes) {
    const balancesToAdd = balanceTypes[balanceType];
    if (!balancesToAdd || !balancesToAdd.length) {
      balancePerType[balanceType] = 0n;
      continue;
    }

    balancesToAdd.forEach((utxo: AggregatedAssetAmount) => {
      // Skip non-AVAX assets
      if (utxo.assetId !== avaxAssetId) {
        return;
      }
      const previousBalance = balancePerType[balanceType] ?? 0n;
      const newBalance = previousBalance + BigInt(utxo.amount);
      balancePerType[balanceType] = newBalance;
    });
  }

  const available = new TokenUnit(
    balancePerType['unlocked'] ? balancePerType['unlocked'] : 0n,
    networkToken.decimals,
    networkToken.symbol,
  );
  const availableInCurrency = priceInCurrency
    ? available.mul(priceInCurrency).toDisplay({ fixedDp: 2, asNumber: true })
    : undefined;
  const totalBalance = new TokenUnit(
    calculateAvaxTotalBalance(balance, avaxAssetId),
    networkToken.decimals,
    networkToken.symbol,
  );
  const balanceInCurrency = priceInCurrency !== undefined ? totalBalance.mul(priceInCurrency) : undefined;

  return {
    ...networkToken,
    coingeckoId,
    type: TokenType.NATIVE,
    priceInCurrency,
    balance: totalBalance.toSubUnit(),
    balanceInCurrency: balanceInCurrency?.toDisplay({ fixedDp: 2, asNumber: true }),
    balanceDisplayValue: totalBalance.toDisplay(),
    balanceCurrencyDisplayValue: balanceInCurrency?.toDisplay({ fixedDp: 2 }),
    available: available.toSubUnit(),
    availableInCurrency,
    availableDisplayValue: available.toDisplay(),
    availableCurrencyDisplayValue: availableInCurrency?.toFixed(2),
    utxos: balance,
    balancePerType: {
      unlocked: balancePerType['unlocked'],
      locked: balancePerType['locked'],
      atomicMemoryUnlocked: balancePerType['atomicMemoryUnlocked'],
      atomicMemoryLocked: balancePerType['atomicMemoryLocked'],
    },
    marketCap,
    vol24,
    change24,
  };
};
