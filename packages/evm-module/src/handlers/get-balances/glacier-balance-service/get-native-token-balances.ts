import type { CurrencyCode, Glacier } from '@avalabs/glacier-sdk';
import { TokenType, type NetworkTokenWithBalance } from '@avalabs/vm-module-types';
import { balanceToDisplayValue, bnToBig } from '@avalabs/utils-sdk';
import { BN } from 'bn.js';

export const getNativeTokenBalances = async ({
  address,
  currency,
  chainId,
  glacierSdk,
}: {
  chainId: number;
  address: string;
  currency: string;
  glacierSdk: Glacier;
}): Promise<NetworkTokenWithBalance> => {
  const nativeBalance = await glacierSdk.evmBalances.getNativeBalance({
    chainId: chainId.toString(),
    address,
    currency: currency.toLocaleLowerCase() as CurrencyCode,
  });
  const nativeTokenBalance = nativeBalance.nativeTokenBalance;
  const balance = new BN(nativeTokenBalance.balance);
  const balanceDisplayValue = balanceToDisplayValue(balance, nativeTokenBalance.decimals);
  const priceInCurrency = nativeTokenBalance.price?.value ?? 0;
  const balanceInCurrency = bnToBig(balance, nativeTokenBalance.decimals).mul(priceInCurrency).toNumber();
  const balanceCurrencyDisplayValue = balanceInCurrency.toFixed(2);

  return {
    name: nativeTokenBalance.name,
    symbol: nativeTokenBalance.symbol,
    decimals: nativeTokenBalance.decimals,
    type: TokenType.NATIVE,
    logoUri: nativeTokenBalance.logoUri,
    balance,
    balanceDisplayValue,
    balanceInCurrency,
    balanceCurrencyDisplayValue,
    priceInCurrency,
    marketCap: 0,
    vol24: 0,
    change24: 0,
    coingeckoId: '',
  };
};
