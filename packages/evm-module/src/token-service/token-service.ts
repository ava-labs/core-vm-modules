import { VsCurrencyType, getBasicCoingeckoHttp, simpleTokenPrice } from '@avalabs/coingecko-sdk';
import type { PriceWithMarketData, SimplePriceResponse } from './coingecko-types';
import { watchlistCacheClient } from './watchlist-cache-client';
import { coingeckoRetry } from '../handlers/get-evm-balances/utils/coingecko-retry';
import { arrayHash } from '../utils/array-hash';
import { coingeckoProxyClient } from './coingecko-proxy-client';
import type { Error as CoingeckoError } from './coingecko-types';
import type { CacheProviderParams, GetCache, SetCache } from '@avalabs/vm-module-types';

const coingeckoBasicClient = getBasicCoingeckoHttp();

export class TokenService {
  #getCache?: GetCache;
  #setCache?: SetCache;
  #proxyApiUrl: string;

  constructor({ getCache, setCache, proxyApiUrl }: CacheProviderParams & { proxyApiUrl: string }) {
    this.#getCache = getCache;
    this.#setCache = setCache;
    this.#proxyApiUrl = proxyApiUrl;
  }

  /**
   * Get token price with market data for a coin
   * @param coinId the coin id ie avalanche-2 for avax
   * @param currency the currency to be used
   * @returns the token price with market data
   */
  async getPriceWithMarketDataByCoinId(
    coinId: string,
    currency: VsCurrencyType = VsCurrencyType.USD,
  ): Promise<PriceWithMarketData> {
    const allPriceData = await this.fetchPriceWithMarketData();
    const data = allPriceData?.[coinId]?.[currency];
    return {
      price: data?.price ?? 0,
      change24: data?.change24 ?? 0,
      marketCap: data?.marketCap ?? 0,
      vol24: data?.vol24 ?? 0,
    };
  }

  /**
   * Get token price with market data from cached watchlist
   * @returns token price with market data
   */
  async fetchPriceWithMarketData(): Promise<SimplePriceResponse | undefined> {
    try {
      let data: SimplePriceResponse | undefined;
      const cacheId = `fetchPriceWithMarketData`;

      data = this.#getCache?.(cacheId) as SimplePriceResponse;

      if (data === undefined) {
        data = await watchlistCacheClient(this.#proxyApiUrl).simplePrice();
        this.#setCache?.(cacheId, data);
      }
      return data;
    } catch (e) {
      return Promise.resolve(undefined);
    }
  }

  /**
   * Get token price with market data for a list of addresses
   * @param tokenAddresses the token addresses
   * @param assetPlatformId The platform id for all the tokens in the list
   * @param currency the currency to be used
   * @returns a list of token price with market data
   */
  async getPricesWithMarketDataByAddresses(
    tokenAddresses: string[],
    assetPlatformId: string,
    currency: VsCurrencyType = VsCurrencyType.USD,
  ): Promise<SimplePriceResponse | undefined> {
    let data: SimplePriceResponse | undefined;

    const key = `${arrayHash(tokenAddresses)}-${assetPlatformId}-${currency}`;

    const cacheId = `getPricesWithMarketDataByAddresses-${key}`;
    data = this.#getCache?.(cacheId) as SimplePriceResponse;

    if (data === undefined) {
      try {
        data = await coingeckoRetry<SimplePriceResponse>((useCoingeckoProxy) =>
          this.fetchPricesWithMarketDataByAddresses({
            assetPlatformId,
            tokenAddresses,
            currency,
            useCoingeckoProxy,
          }),
        );
      } catch {
        data = undefined;
      }

      this.#setCache?.(cacheId, data);
    }

    return data;
  }

  private async fetchPricesWithMarketDataByAddresses({
    assetPlatformId,
    tokenAddresses,
    currency = VsCurrencyType.USD,
    useCoingeckoProxy = false,
  }: {
    assetPlatformId: string;
    tokenAddresses: string[];
    currency: VsCurrencyType;
    useCoingeckoProxy?: boolean;
  }): Promise<SimplePriceResponse | CoingeckoError> {
    if (useCoingeckoProxy) {
      return coingeckoProxyClient(this.#proxyApiUrl).simplePriceByContractAddresses(undefined, {
        params: {
          id: assetPlatformId,
        },
        queries: {
          contract_addresses: tokenAddresses,
          vs_currencies: [currency],
          include_market_cap: true,
          include_24hr_vol: true,
          include_24hr_change: true,
        },
      });
    }

    return simpleTokenPrice(coingeckoBasicClient, {
      assetPlatformId,
      tokenAddresses,
      currencies: [currency],
      marketCap: true,
      vol24: true,
      change24: true,
    });
  }
}
