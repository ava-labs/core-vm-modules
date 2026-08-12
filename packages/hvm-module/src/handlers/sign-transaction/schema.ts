import { z } from 'zod';

// Schema for validating the transaction data
const transactionSchema = z.object({
  tx: z
    .object({
      base: z.object({
        timestamp: z.string(),
        chainId: z.string(),
        maxFee: z.string(),
      }),
      actions: z.array(
        z.object({
          actionName: z.string(),
          data: z.record(z.string(), z.unknown()),
        }),
      ),
    })
    .required(),
});

const paramsSchema = z.array(transactionSchema).length(1);

export const parseRequestParams = (params: unknown) => {
  return paramsSchema.safeParse(params);
};
