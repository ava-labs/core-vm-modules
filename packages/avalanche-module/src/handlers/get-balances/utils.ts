import type { CurrencyCode, PChainBalance, XChainBalances } from '@avalabs/glacier-sdk';
import BN from 'bn.js';
import { AvalancheGlacierService } from '../../services/glacier-service/glacier-service';
import type { Storage } from '@avalabs/vm-module-types';

export const isPchainBalance = (balanceResult: PChainBalance | XChainBalances): balanceResult is PChainBalance => {
  return Object.keys(balanceResult).includes('unlockedUnstaked');
};

export const isXchainBalance = (balanceResult: PChainBalance | XChainBalances): balanceResult is XChainBalances => {
  return Object.keys(balanceResult).includes('locked');
};

export function calculateTotalBalance(uxtos: PChainBalance | XChainBalances): BN {
  const sum = Object.values(uxtos).reduce(function (totalAcc, utxoList) {
    const typeSum = utxoList.reduce(function (typeAcc, utxo) {
      const balanceToAdd = Number(utxo.amount);
      return typeAcc + balanceToAdd;
    }, 0);

    return totalAcc + typeSum;
  }, 0);

  return new BN(sum);
}

export function getTokenValue(decimals: number, amount?: number) {
  return amount === undefined ? 0 : amount / 10 ** decimals;
}

export const getTokenPrice = async ({
  glacierService,
  storage,
  currency,
  chainId,
  address,
}: {
  glacierService: AvalancheGlacierService;
  currency: string;
  storage?: Storage;
  chainId: number;
  address: string;
}): Promise<number | undefined> => {
  const key = chainId ? `${chainId}-${currency}` : `${currency}`;
  const cacheId = `getSimplePrice-${key}`;
  const cachedData = storage?.get?.<number>(cacheId);

  if (cachedData) return cachedData;

  const nativeBalance = await glacierService.getNativeBalance({
    chainId: chainId.toString(),
    address,
    currency: currency.toLowerCase() as CurrencyCode,
  });

  if (nativeBalance.nativeTokenBalance.price?.value) {
    storage?.set?.<number>(cacheId, nativeBalance.nativeTokenBalance.price.value);
    return nativeBalance.nativeTokenBalance.price.value;
  }
};
