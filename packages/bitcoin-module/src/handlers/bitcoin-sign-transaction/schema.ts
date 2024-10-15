import { z } from 'zod';

const inputUtxo = z.object({
  txHash: z.string(),
  txHex: z.string().optional(),
  index: z.number(),
  value: z.number(),
  script: z.string().min(1), // Just make sure it's never an empty string
  blockHeight: z.number(),
  confirmations: z.number(),
  confirmedTime: z.string().optional(),
});

const outputUtxo = z.object({
  address: z.string(),
  value: z.number(),
});

const paramsSchema = z.object({
  inputs: z.array(inputUtxo).min(1),
  outputs: z.array(outputUtxo).min(1),
});

export const parseRequestParams = (params: unknown) => {
  return paramsSchema.safeParse(params);
};

export type BitcoinSignTransactionParams = z.infer<typeof paramsSchema>;
