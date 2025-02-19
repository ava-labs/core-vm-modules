import { TokenType } from '@avalabs/vm-module-types';
import { z } from 'zod';

export const SPL_TOKEN_SCHEMA = z.object({
  address: z.string(),
  name: z.string(),
  symbol: z.string(),
  contractType: z.literal(TokenType.SPL),
  caip2Id: z.string().startsWith('solana:'),
  decimals: z.number(),
  chainId: z.number().optional(),
  logoUri: z.string().optional(),
  color: z.string().optional(),
});

export const SPL_TOKENS_SCHEMA = z.array(SPL_TOKEN_SCHEMA);
