import { z } from 'zod';

const transactionSchema = z.object({
  account: z.string(),
  serializedTx: z.string().base64(),
});

const paramsSchema = z.tuple([transactionSchema]);

export const parseRequestParams = (params: unknown) => {
  return paramsSchema.safeParse(params);
};

export type TransactionParams = z.infer<typeof transactionSchema>;
