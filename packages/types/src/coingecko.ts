import { number, object, record, z } from 'zod';

const SimplePriceInCurrency = object({
  price: number().optional().nullable(),
  change24: number().optional().nullable(),
  marketCap: number().optional().nullable(),
  vol24: number().optional().nullable(),
});

const SimplePriceInCurrencyResponseSchema = record(SimplePriceInCurrency);
export const SimplePriceResponseSchema = record(SimplePriceInCurrencyResponseSchema);
export type SimplePriceResponse = z.infer<typeof SimplePriceResponseSchema>;

export const RawSimplePriceResponseSchema = record(record(number().nullable().optional()));
export type RawSimplePriceResponse = z.infer<typeof RawSimplePriceResponseSchema>;
