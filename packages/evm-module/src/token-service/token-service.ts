import {
  VsCurrencyType,
  getBasicCoingeckoHttp,
  simplePrice,
  simpleTokenPrice,
  type SimplePriceParams,
} from '@avalabs/coingecko-sdk';
import type { SimplePriceResponse } from './coingecko-types';
import { coingeckoRetry } from '../handlers/get-balances/utils/coingecko-retry';
import { arrayHash } from '../utils/array-hash';
import { coingeckoProxyClient } from './coingecko-proxy-client';
import type { Error as CoingeckoError } from './coingecko-types';
import type { Cache, RawSimplePriceResponse } from '@avalabs/vm-module-types';

const coingeckoBasicClient = getBasicCoingeckoHttp();

export class TokenService {
  #cache?: Cache;
  #proxyApiUrl: string;

  constructor({ cache, proxyApiUrl }: { proxyApiUrl: string; cache?: Cache }) {
    this.#cache = cache;
    this.#proxyApiUrl = proxyApiUrl;
  }

  /**
   * Get token price with market data first on coingecko (free tier) directly,
   * if we get 429 error, retry it on coingecko proxy (paid service)
   * @returns token price with market data
   */
  async getSimplePrice({
    coinIds = [],
    currencies = [VsCurrencyType.USD],
  }: SimplePriceParams): Promise<SimplePriceResponse | undefined> {
    let data: SimplePriceResponse | undefined;

    const key = coinIds ? `${arrayHash(coinIds)}-${currencies.toString()}` : `${currencies.toString()}`;

    const cacheId = `getSimplePrice-${key}`;

    data = this.#cache?.get?.(cacheId) as SimplePriceResponse;

    if (data === undefined) {
      try {
        data = await coingeckoRetry<SimplePriceResponse>((useCoingeckoProxy) =>
          this.simplePrice({
            coinIds,
            currencies,
            marketCap: true,
            vol24: true,
            change24: true,
            useCoingeckoProxy,
          }),
        );
      } catch {
        data = undefined;
      }
      this.#cache?.set?.(cacheId, data);
    }

    return data;
  }

  /**
   * Get token price with market data for a list of addresses
   * @param tokenAddresses the token addresses
   * @param assetPlatformId The platform id for all the tokens in the list
   * @param currency the currency to be used
   * @returns a list of token price with market data
   */
  async getPricesByAddresses(
    tokenAddresses: string[],
    assetPlatformId: string,
    currency: VsCurrencyType = VsCurrencyType.USD,
  ): Promise<SimplePriceResponse | undefined> {
    let data: SimplePriceResponse | undefined;

    const key = `${arrayHash(tokenAddresses)}-${assetPlatformId}-${currency}`;

    const cacheId = `getPricesWithMarketDataByAddresses-${key}`;
    data = this.#cache?.get?.(cacheId) as SimplePriceResponse;

    if (data === undefined) {
      try {
        data = await coingeckoRetry<SimplePriceResponse>((useCoingeckoProxy) =>
          this.fetchPricesByAddresses({
            assetPlatformId,
            tokenAddresses,
            currency,
            useCoingeckoProxy,
          }),
        );
      } catch {
        data = undefined;
      }

      this.#cache?.set?.(cacheId, data);
    }

    return data;
  }

  private async fetchPricesByAddresses({
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

  private async simplePrice({
    coinIds = [],
    currencies = [VsCurrencyType.USD],
    marketCap = false,
    vol24 = false,
    change24 = false,
    lastUpdated = false,
    useCoingeckoProxy = false,
  }: SimplePriceParams & { useCoingeckoProxy?: boolean }): Promise<SimplePriceResponse | CoingeckoError> {
    if (useCoingeckoProxy) {
      const rawData = await coingeckoProxyClient(this.#proxyApiUrl).simplePrice(undefined, {
        queries: {
          ids: coinIds?.join(','),
          vs_currencies: currencies.join(','),
          include_market_cap: String(marketCap),
          include_24hr_vol: String(vol24),
          include_24hr_change: String(change24),
          include_last_updated_at: String(lastUpdated),
        },
      });
      return this.transformSimplePriceResponse(rawData);
    }
    return simplePrice(coingeckoBasicClient, {
      coinIds,
      currencies,
      marketCap,
      vol24,
      change24,
      lastUpdated,
      shouldThrow: true,
    });
  }

  private transformSimplePriceResponse = (
    data: RawSimplePriceResponse,
    currencies = [VsCurrencyType.USD],
  ): SimplePriceResponse => {
    const formattedData: SimplePriceResponse = {};
    Object.keys(data).forEach((id) => {
      const tokenData = data[id];
      formattedData[id] = {};
      currencies.forEach((currency: VsCurrencyType) => {
        formattedData[id] = {
          [currency]: {
            price: tokenData?.[currency],
            change24: tokenData?.[`${currency}_24h_change`],
            vol24: tokenData?.[`${currency}_24h_vol`],
            marketCap: tokenData?.[`${currency}_market_cap`],
          },
        };
      });
    });
    return formattedData;
  };
}
