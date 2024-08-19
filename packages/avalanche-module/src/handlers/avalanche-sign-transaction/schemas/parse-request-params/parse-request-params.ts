import { z } from 'zod';

const paramsSchema = z.object({
  from: z.string().describe('Avalanche receiving address'),
  transactionHex: z.string(),
  chainAlias: z.enum(['X', 'P', 'C']),
  isTestnet: z.boolean().optional(),
});

export const parseRequestParams = (params: unknown) => {
  return paramsSchema.safeParse(params);
};
