import type { AggregatedAssetAmount, PChainBalance } from '@avalabs/glacier-sdk';
import { balanceToDisplayValue, bnToBig } from '@avalabs/utils-sdk';
import { BN } from 'bn.js';
import { calculateTotalBalance, getTokenValue } from './utils';
import { TokenType, type NetworkToken, type TokenWithBalancePVM } from '@avalabs/vm-module-types';

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
  priceInCurrency: number;
  marketCap: number;
  vol24: number;
  change24: number;
  coingeckoId: string;
}): TokenWithBalancePVM => {
  const decimals = networkToken.decimals;
  const balancePerType: Record<string, number> = {};

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
      balancePerType[balanceType] = 0;
      continue;
    }

    balancesToAdd.forEach((uxto: AggregatedAssetAmount) => {
      const previousBalance = balancePerType[balanceType] ?? 0;
      const newBalance = previousBalance + Number(uxto.amount);
      balancePerType[balanceType] = newBalance;
    });
  }

  const available = balancePerType['unlockedUnstaked'] ? new BN(balancePerType['unlockedUnstaked']) : new BN(0);
  const availableInCurrency = bnToBig(available, decimals).mul(priceInCurrency).toNumber();
  const availableDisplayValue = balanceToDisplayValue(available, decimals);
  const totalBalance = calculateTotalBalance(balance);
  const balanceInCurrency = bnToBig(totalBalance, decimals).mul(priceInCurrency).toNumber();
  const balanceDisplayValue = balanceToDisplayValue(totalBalance, decimals);

  return {
    ...networkToken,
    type: TokenType.NATIVE,
    priceInCurrency,
    balance: totalBalance,
    balanceInCurrency,
    balanceDisplayValue,
    balanceCurrencyDisplayValue: balanceInCurrency?.toFixed(2),
    available,
    availableInCurrency,
    availableDisplayValue,
    availableCurrencyDisplayValue: availableInCurrency?.toFixed(2),
    utxos: balance,
    balancePerType: {
      lockedStaked: getTokenValue(decimals, balancePerType['lockedStaked']),
      lockedStakeable: getTokenValue(decimals, balancePerType['lockedStakeable']),
      lockedPlatform: getTokenValue(decimals, balancePerType['lockedPlatform']),
      atomicMemoryLocked: getTokenValue(decimals, balancePerType['atomicMemoryLocked']),
      atomicMemoryUnlocked: getTokenValue(decimals, balancePerType['atomicMemoryUnlocked']),
      unlockedUnstaked: getTokenValue(decimals, balancePerType['unlockedUnstaked']),
      unlockedStaked: getTokenValue(decimals, balancePerType['unlockedStaked']),
      pendingStaked: getTokenValue(decimals, balancePerType['pendingStaked']),
    },
    marketCap,
    vol24,
    change24,
    coingeckoId,
  };
};
