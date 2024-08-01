import { TokenUnit } from '@avalabs/core-utils-sdk';
import { type Network, type NetworkTokenWithBalance, TokenType } from '@avalabs/vm-module-types';
import type { VsCurrencyType } from '@avalabs/core-coingecko-sdk';
import { TokenService } from '@internal/utils';
import type { Provider } from 'ethers';

export const getNativeTokenBalances = async ({
  provider,
  tokenService,
  address,
  currency,
  network,
}: {
  provider: Provider;
  tokenService: TokenService;
  address: string;
  currency: string;
  network: Network;
}): Promise<NetworkTokenWithBalance> => {
  const coingeckoTokenId = network.pricingProviders?.coingecko.nativeTokenId;
  const networkToken = network.networkToken;
  const simplePriceResponse = coingeckoTokenId
    ? await tokenService.getSimplePrice({
        coinIds: [coingeckoTokenId],
        currencies: [currency] as VsCurrencyType[],
      })
    : {};

  const priceInCurrency = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.price ?? undefined;
  const marketCap = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.marketCap ?? undefined;
  const vol24 = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.vol24 ?? undefined;
  const change24 = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.change24 ?? undefined;

  const balance = await provider.getBalance(address);
  const balanceUnit = new TokenUnit(balance, networkToken.decimals, networkToken.symbol);
  const balanceDisplayValue = balanceUnit.toDisplay();
  const balanceCurrencyDisplayValue = priceInCurrency ? balanceUnit.mul(priceInCurrency).toDisplay(2) : undefined;
  const balanceInCurrency = balanceCurrencyDisplayValue ? Number(balanceCurrencyDisplayValue) : undefined;

  return {
    ...networkToken,
    coingeckoId: coingeckoTokenId ?? '',
    type: TokenType.NATIVE,
    balance,
    balanceDisplayValue,
    balanceInCurrency,
    balanceCurrencyDisplayValue,
    priceInCurrency,
    marketCap,
    vol24,
    change24,
  };
};
