import type { CurrencyCode, Glacier } from '@avalabs/glacier-sdk';
import { TokenType, type NetworkTokenWithBalance } from '@avalabs/vm-module-types';
import { TokenUnit, stringToBN } from '@avalabs/utils-sdk';

export const getNativeTokenBalances = async ({
  address,
  currency,
  chainId,
  glacierSdk,
}: {
  chainId: string;
  address: string;
  currency: string;
  glacierSdk: Glacier;
}): Promise<NetworkTokenWithBalance> => {
  const nativeBalance = await glacierSdk.evmBalances.getNativeBalance({
    chainId,
    address,
    currency: currency.toLocaleLowerCase() as CurrencyCode,
  });
  const nativeTokenBalance = nativeBalance.nativeTokenBalance;
  const balanceTokenUnit = new TokenUnit(
    nativeTokenBalance.balance,
    nativeTokenBalance.decimals,
    nativeTokenBalance.symbol,
  );
  // todo: simply return TokenUnit when we have all modules implemented
  const balance = stringToBN(nativeTokenBalance.balance, nativeTokenBalance.decimals);
  const balanceDisplayValue = balanceTokenUnit.toDisplay();
  const priceInCurrency = nativeTokenBalance.price?.value ?? 0;
  const balanceInCurrency = Number(balanceTokenUnit.mul(priceInCurrency).toSubUnit());
  const balanceCurrencyDisplayValue = nativeTokenBalance.balanceValue?.value.toString() ?? '0';

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
