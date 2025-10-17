import {
  VsCurrencyType,
  getBasicCoingeckoHttp,
  simplePrice,
  simpleTokenPrice,
  type SimplePriceParams,
} from '@avalabs/core-coingecko-sdk';
import type { Storage, RawSimplePriceResponse, SimplePriceResponse } from '@avalabs/vm-module-types';
import { coingeckoRetry } from '../../utils/coingecko-retry';
import { arrayHash } from '../../utils/array-hash';
import { CoingeckoProxyClient } from './coingecko-proxy-client';
import { WatchlistProxyClient } from './watchlist-proxy-client';

const coingeckoBasicClient = getBasicCoingeckoHttp();

export class TokenService {
  #storage?: Storage;
  #proxyApiUrl: string;

  constructor({ storage, proxyApiUrl }: { proxyApiUrl: string; storage?: Storage }) {
    this.#storage = storage;
    this.#proxyApiUrl = proxyApiUrl;
  }

  async getWatchlistDataForToken({
    tokenDetails,
    currency = VsCurrencyType.USD,
  }: {
    tokenDetails: {
      symbol: string;
      isNative: boolean;
      caip2Id: string;
      address?: string;
    };
    currency: VsCurrencyType;
  }): Promise<{
    priceInCurrency: number;
    change24: number;
    marketCap: number;
    vol24: number;
  }> {
    const data = (
      await new WatchlistProxyClient(this.#proxyApiUrl).watchlistToken({
        tokens: tokenDetails.symbol,
        currency: currency,
      })
    ).filter((token) => {
      return tokenDetails.isNative
        ? token.internalId === `NATIVE-${tokenDetails.symbol.toLowerCase()}`
        : token.platforms[tokenDetails.caip2Id] === tokenDetails.address;
    });

    const tokenInfo = data[0];

    if (!tokenInfo) {
      return {
        priceInCurrency: 0,
        change24: 0,
        marketCap: 0,
        vol24: 0,
      };
    }

    return {
      priceInCurrency: tokenInfo.current_price ?? 0,
      change24: tokenInfo.price_change_percentage_24h ?? 0,
      marketCap: tokenInfo.market_cap ?? 0,
      vol24: tokenInfo.total_volume ?? 0,
    };
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

    data = this.#storage?.get?.<SimplePriceResponse>(cacheId);

    if (data) return data;

    try {
      data = await coingeckoRetry((useCoingeckoProxy) =>
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
    this.#storage?.set?.(cacheId, data);
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
    data = this.#storage?.get?.<SimplePriceResponse>(cacheId);

    if (data) return data;

    try {
      data = await coingeckoRetry((useCoingeckoProxy) =>
        this.fetchPricesByAddresses({
          assetPlatformId,
          tokenAddresses,
          currency,
          useCoingeckoProxy,
        }),
      );
    } catch (err) {
      console.error(err);
      data = undefined;
    }
    this.#storage?.set?.(cacheId, data);
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
  }): Promise<SimplePriceResponse> {
    if (useCoingeckoProxy) {
      const rawData = await new CoingeckoProxyClient(this.#proxyApiUrl).simplePriceByContractAddresses({
        id: assetPlatformId,
        contract_addresses: tokenAddresses,
        vs_currencies: [currency],
        include_market_cap: true,
        include_24hr_vol: true,
        include_24hr_change: true,
      });
      return this.transformSimplePriceResponse(rawData, [currency]);
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
    shouldThrow = true,
  }: SimplePriceParams & { useCoingeckoProxy?: boolean }): Promise<SimplePriceResponse> {
    if (useCoingeckoProxy) {
      const rawData = await new CoingeckoProxyClient(this.#proxyApiUrl).simplePrice({
        ids: coinIds,
        vs_currencies: currencies,
        include_market_cap: marketCap,
        include_24hr_vol: vol24,
        include_24hr_change: change24,
        include_last_updated_at: lastUpdated,
      });
      return this.transformSimplePriceResponse(rawData, currencies);
    }
    return simplePrice(coingeckoBasicClient, {
      coinIds,
      currencies,
      marketCap,
      vol24,
      change24,
      lastUpdated,
      shouldThrow,
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
