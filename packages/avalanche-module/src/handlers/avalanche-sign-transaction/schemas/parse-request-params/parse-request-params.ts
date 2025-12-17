import { z } from 'zod';

const paramsSchema = z.object({
  transactionHex: z.string(),
  chainAlias: z.enum(['X', 'P', 'C']),
  utxos: z.string().array().optional(),
});

export const parseRequestParams = (params: unknown) => {
  return paramsSchema.safeParse(params);
};
