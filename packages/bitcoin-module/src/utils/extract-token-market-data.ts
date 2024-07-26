import type { SimplePriceResponse, TokenMarketData } from '@avalabs/vm-module-types';

export const extractTokenMarketData = (
  coinId: string,
  currency?: string,
  data?: SimplePriceResponse,
): TokenMarketData => {
  const coinData = data?.[coinId]?.[currency ?? ''] ?? {};

  return {
    priceInCurrency: coinData.price ?? undefined,
    marketCap: coinData.marketCap ?? undefined,
    vol24: coinData.vol24 ?? undefined,
    change24: coinData.change24 ?? undefined,
  };
};
