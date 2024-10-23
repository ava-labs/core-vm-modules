import { z } from 'zod';

const transactionSchema = z.object({
  from: z.string().length(42),
  to: z.string().length(42).optional(),
  data: z.string().optional(),
  value: z.string().startsWith('0x').optional(),
  gas: z.string().startsWith('0x').optional(),
  gasPrice: z.string().startsWith('0x').optional(),
  maxFeePerGas: z.string().startsWith('0x').optional(),
  maxPriorityFeePerGas: z.string().startsWith('0x').optional(),
  nonce: z.string().optional(),
  chainId: z.string().optional(),
});

const paramsSchema = z.array(transactionSchema).length(1);

export const parseRequestParams = (params: unknown) => {
  return paramsSchema.safeParse(params);
};
