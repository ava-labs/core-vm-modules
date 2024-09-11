import z, { number, object, record, string } from 'zod';
import { fetchAndVerify } from '../../utils/fetch-and-verify';

const CURRENCY_EXCHANGE_RATES_URL =
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json';

const CURRENCY_EXCHANGE_RATES_FALLBACK_URL = 'https://latest.currency-api.pages.dev/v1/currencies/usd.min.json';

const ExchangeRateSchema = object({
  date: string(),
  usd: record(number()),
});

type ExchangeRate = z.infer<typeof ExchangeRateSchema>;

export const getExchangeRates = async (): Promise<ExchangeRate> => {
  try {
    return await fetchAndVerify([CURRENCY_EXCHANGE_RATES_URL], ExchangeRateSchema);
  } catch {
    return await fetchAndVerify([CURRENCY_EXCHANGE_RATES_FALLBACK_URL], ExchangeRateSchema);
  }
};
