import { Zodios } from '@zodios/core';
import z, { number, object, record, string } from 'zod';

const CURRENCY_EXCHANGE_RATES_URL =
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json';

const CURRENCY_EXCHANGE_RATES_FALLBACK_URL = 'https://latest.currency-api.pages.dev/v1/currencies/usd.min.json';

const ExchangeRateSchema = object({
  date: string(),
  usd: record(number()),
});

type ExchangeRate = z.infer<typeof ExchangeRateSchema>;

const exchangeRateApiClient = new Zodios(CURRENCY_EXCHANGE_RATES_URL, [
  {
    method: 'get',
    path: '',
    alias: 'getExchangeRates',
    response: ExchangeRateSchema,
  },
]);

const exchangeRateFallbackApiClient = new Zodios(CURRENCY_EXCHANGE_RATES_FALLBACK_URL, [
  {
    method: 'get',
    path: '',
    alias: 'getExchangeRates',
    response: ExchangeRateSchema,
  },
]);

export const getExchangeRates = async (): Promise<ExchangeRate> => {
  try {
    return await exchangeRateApiClient.getExchangeRates();
  } catch {
    return await exchangeRateFallbackApiClient.getExchangeRates();
  }
};
