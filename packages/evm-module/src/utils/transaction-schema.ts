import { z } from 'zod';

export const transactionSchema = z.object({
  from: z.string().length(42),
  to: z.string().length(42).optional(),
  data: z.string().optional(),
  value: z.string().startsWith('0x').optional(),
  gas: z.string().startsWith('0x').optional(),
  gasPrice: z.string().startsWith('0x').optional(),
  maxFeePerGas: z.string().startsWith('0x').optional(),
  maxPriorityFeePerGas: z.string().startsWith('0x').optional(),
  nonce: z.string().optional(),
  chainId: z.string().optional().or(z.number().optional()),
});

export type TransactionParams = z.infer<typeof transactionSchema>;
