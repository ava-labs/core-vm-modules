import type { AggregatedAssetAmount, XChainBalances } from '@avalabs/glacier-sdk';
import { TokenUnit } from '@avalabs/utils-sdk';
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

  const totalBalance = new TokenUnit(calculateTotalBalance(balance), networkToken.decimals, networkToken.symbol);
  const balanceDisplayValue = totalBalance.toDisplay();
  const balanceCurrencyDisplayValue = priceInCurrency ? totalBalance.mul(priceInCurrency).toDisplay(2) : undefined;
  const balanceInCurrency = balanceCurrencyDisplayValue ? Number(balanceCurrencyDisplayValue) : undefined;

  return {
    ...networkToken,
    coingeckoId,
    type: TokenType.NATIVE,
    priceInCurrency,
    balance: totalBalance.toSubUnit(),
    balanceInCurrency,
    balanceDisplayValue,
    balanceCurrencyDisplayValue,
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
