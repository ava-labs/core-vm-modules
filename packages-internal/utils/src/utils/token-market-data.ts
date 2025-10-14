import type { VsCurrencyType } from '@avalabs/core-coingecko-sdk';
import type { Network, SimplePriceResponse, TokenMarketData } from '@avalabs/vm-module-types';
import type { TokenService } from '../services/token-service/token-service';

export const extractTokenMarketData = (
  key?: string,
  currency?: VsCurrencyType,
  prices?: SimplePriceResponse,
): TokenMarketData => {
  const tokenData = prices?.[key ?? '']?.[currency ?? ''] ?? {};

  return {
    priceInCurrency: tokenData.price ?? undefined,
    marketCap: tokenData.marketCap ?? undefined,
    vol24: tokenData.vol24 ?? undefined,
    change24: tokenData.change24 ?? undefined,
    tokenId: key,
  };
};

export const getNativeTokenMarketData = async ({
  network,
  tokenService,
  currency,
}: {
  network: Network;
  tokenService: TokenService;
  currency: VsCurrencyType;
}): Promise<TokenMarketData> => {
  const coingeckoId = network.pricingProviders?.coingecko.nativeTokenId;
  const simplePriceResponse = await fetchNativeTokenMarketData({ network, tokenService, currency });

  return extractTokenMarketData(coingeckoId, currency, simplePriceResponse);
};

export const fetchNativeTokenMarketData = async ({
  network,
  tokenService,
  currency,
}: {
  network: Network;
  tokenService: TokenService;
  currency: VsCurrencyType;
}): Promise<SimplePriceResponse> => {
  const coingeckoId = network.pricingProviders?.coingecko.nativeTokenId;
  if (!coingeckoId || !currency) {
    return {};
  }

  const simplePriceResponse = await tokenService.getSimplePrice({
    coinIds: [coingeckoId],
    currencies: [currency],
  });

  return simplePriceResponse ?? {};
};

export const fetchContractTokensMarketData = async ({
  tokenAddresses,
  network,
  tokenService,
  currency,
}: {
  tokenAddresses: string[];
  network: Network;
  tokenService: TokenService;
  currency: VsCurrencyType;
}): Promise<SimplePriceResponse> => {
  const assetPlatformId = network.pricingProviders?.coingecko.assetPlatformId;
  if (!assetPlatformId || tokenAddresses.length === 0 || !currency) {
    return {};
  }

  const simplePriceResponse = await tokenService.getPricesByAddresses(tokenAddresses, assetPlatformId, currency);
  return simplePriceResponse ?? {};
};
