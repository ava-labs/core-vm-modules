import { z } from 'zod';

export const PORTFOLIO_SCHEMA = z.object({
  nativeBalance: z.object({
    lamports: z.string(),
    solana: z.string(),
  }),
  nfts: z.array(
    z.object({
      associatedTokenAddress: z.string(),
      mint: z.string(),
      name: z.string(),
      symbol: z.string(),
    }),
  ),
  tokens: z.array(
    z.object({
      associatedTokenAddress: z.string(),
      mint: z.string(),
      amountRaw: z.string(),
      amount: z.string(),
      decimals: z.number(),
      name: z.string(),
      symbol: z.string(),
      logo: z.string().optional().nullable(),
    }),
  ),
});

export type PortfolioResponse = z.infer<typeof PORTFOLIO_SCHEMA>;
