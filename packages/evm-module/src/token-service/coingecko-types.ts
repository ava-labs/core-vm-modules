import { VsCurrencyType } from '@avalabs/coingecko-sdk';
import { date, number, object, record, string, z } from 'zod';

export type SparklineData = number[];

export const ChartDataSchema = object({
  ranges: object({
    minDate: number(),
    maxDate: number(),
    minPrice: number(),
    maxPrice: number(),
    diffValue: number(),
    percentChange: number(),
  }),
  dataPoints: object({
    date: string()
      .or(date())
      .transform((arg: string | Date) => new Date(arg)),
    value: number(),
  }).array(),
});

export type ChartData = z.infer<typeof ChartDataSchema>;

export type GetMarketsParams = {
  currency?: VsCurrencyType;
  sparkline?: boolean;
  coinIds?: string[];
  page?: number;
  perPage?: number;
};

const SimplePriceInCurrency = object({
  price: number().optional().nullable(),
  change24: number().optional().nullable(),
  marketCap: number().optional().nullable(),
  vol24: number().optional().nullable(),
});

const SimplePriceInCurrencyResponseSchema = record(SimplePriceInCurrency);

export const SimplePriceResponseSchema = record(SimplePriceInCurrencyResponseSchema);

export type SimplePriceInCurrencyResponse = z.infer<typeof SimplePriceInCurrencyResponseSchema>;
export type SimplePriceResponse = z.infer<typeof SimplePriceResponseSchema>;

export const RawSimplePriceResponseSchema = record(record(number().nullable().optional()));
export type RawSimplePriceResponse = z.infer<typeof RawSimplePriceResponseSchema>;

export type Error = {
  status: {
    error_code: number;
    error_message: string;
  };
};
