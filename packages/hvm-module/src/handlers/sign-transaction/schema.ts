import { z } from 'zod';

const transactionSchema = z.object({
  abi: z.object({
    actions: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
      }),
    ),
    outputs: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
      }),
    ),
    types: z.array(
      z.object({
        name: z.string(),
        fields: z.array(
          z.object({
            name: z.string(),
            type: z.string(),
          }),
        ),
      }),
    ),
  }),
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
