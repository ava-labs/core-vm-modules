import { z } from 'zod';

const transactionSchema = z.object({
  account: z.string(),
  serializedTx: z.string().base64(),
  sendOptions: z
    .object({
      preflightCommitment: z.enum(['processed', 'confirmed', 'finalized']).optional(),
      maxRetries: z.bigint().optional(),
      minContextSlot: z.bigint().optional(),
      skipPreflight: z.boolean().optional(),
    })
    .optional(),
});

const paramsSchema = z.tuple([transactionSchema]);

export const parseRequestParams = (params: unknown) => {
  return paramsSchema.safeParse(params);
};

export type TransactionParams = z.infer<typeof transactionSchema>;
export type SendOptions = z.infer<typeof transactionSchema>['sendOptions'];
