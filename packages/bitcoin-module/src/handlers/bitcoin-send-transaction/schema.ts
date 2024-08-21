import { z } from 'zod';

const paramsSchema = z.object({
  from: z.string(),
  to: z.string(),
  amount: z.number(),
  feeRate: z.number(),
});

export const parseRequestParams = (params: unknown) => {
  return paramsSchema.safeParse(params);
};

export type BitcoinSendTransactionParams = z.infer<typeof paramsSchema>;
