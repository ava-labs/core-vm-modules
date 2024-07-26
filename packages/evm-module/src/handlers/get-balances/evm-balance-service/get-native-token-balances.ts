import { balanceToDisplayValue, bigToBN, bigintToBig, bnToBig } from '@avalabs/utils-sdk';
import { TokenType, type Network, type NetworkTokenWithBalance } from '@avalabs/vm-module-types';
import type { VsCurrencyType } from '@avalabs/coingecko-sdk';
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
        coinId: coingeckoTokenId,
        currency: currency as VsCurrencyType,
      })
    : {};

  const priceInCurrency = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.price ?? undefined;
  const marketCap = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.marketCap ?? undefined;
  const vol24 = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.vol24 ?? undefined;
  const change24 = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.change24 ?? undefined;

  const balanceBigint = await provider.getBalance(address);
  const balaceBig = bigintToBig(balanceBigint, networkToken.decimals);
  const balance = bigToBN(balaceBig, networkToken.decimals);
  const balanceDisplayValue = balanceToDisplayValue(balance, networkToken.decimals);
  const balanceInCurrency = priceInCurrency
    ? bnToBig(balance, networkToken.decimals).mul(priceInCurrency).toNumber()
    : undefined;
  const balanceCurrencyDisplayValue = balanceInCurrency?.toFixed(2);

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
