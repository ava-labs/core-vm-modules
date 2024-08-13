import type { AggregatedAssetAmount, XChainBalances } from '@avalabs/glacier-sdk';
import { TokenUnit } from '@avalabs/core-utils-sdk';
import { calculateTotalBalance, getTokenValue } from './utils';
import { TokenType, type NetworkToken, type TokenWithBalanceAVM } from '@avalabs/vm-module-types';

export const convertXChainBalance = ({
  balance,
  networkToken,
  priceInCurrency,
  marketCap,
  vol24,
  change24,
  coingeckoId,
}: {
  balance: XChainBalances;
  networkToken: NetworkToken;
  priceInCurrency?: number;
  marketCap?: number;
  vol24?: number;
  change24?: number;
  coingeckoId: string;
}): TokenWithBalanceAVM => {
  const decimals = networkToken.decimals;
  const balancePerType: Record<string, number> = {};

  const balanceTypes: Record<string, AggregatedAssetAmount[]> = {
    unlocked: balance.unlocked,
    locked: balance.locked,
    atomicMemoryUnlocked: balance.atomicMemoryUnlocked,
    atomicMemoryLocked: balance.atomicMemoryLocked,
  };

  for (const balanceType in balanceTypes) {
    const balancesToAdd = balanceTypes[balanceType];
    if (!balancesToAdd || !balancesToAdd.length) {
      balancePerType[balanceType] = 0;
      continue;
    }

    balancesToAdd.forEach((uxto: AggregatedAssetAmount) => {
      const previousBalance = balancePerType[balanceType] ?? 0;
      const newBalance = previousBalance + Number(uxto.amount);
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
  const totalBalance = new TokenUnit(calculateTotalBalance(balance), networkToken.decimals, networkToken.symbol);
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
      unlocked: getTokenValue(decimals, balancePerType['unlocked']),
      locked: getTokenValue(decimals, balancePerType['locked']),
      atomicMemoryUnlocked: getTokenValue(decimals, balancePerType['atomicMemoryUnlocked']),
      atomicMemoryLocked: getTokenValue(decimals, balancePerType['atomicMemoryLocked']),
    },
    marketCap,
    vol24,
    change24,
  };
};
