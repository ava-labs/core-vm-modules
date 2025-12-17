import { z } from 'zod';

const paramsSchema = z.object({
  from: z.string().optional().describe('Avalanche receiving address'),
  transactionHex: z.string(),
  chainAlias: z.enum(['X', 'P', 'C']),
  utxos: z.string().array().optional(),
});

export const parseRequestParams = (params: unknown) => {
  return paramsSchema.safeParse(params);
};
