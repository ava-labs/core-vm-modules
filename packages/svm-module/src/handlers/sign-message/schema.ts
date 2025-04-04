import { isTransactionBytes } from '@src/utils/is-transaction-bytes';
import { z } from 'zod';

const signMessageSchema = z
  .object({
    account: z.string(),
    serializedMessage: z.string().base64(),
  })
  .refine(({ serializedMessage }) => !isTransactionBytes(serializedMessage), {
    message: 'Cannot use signMessage() calls for signing transactions',
  });

const paramsSchema = z.tuple([signMessageSchema]);

export const parseRequestParams = (params: unknown) => {
  return paramsSchema.safeParse(params);
};

export type SignMessageParams = z.infer<typeof signMessageSchema>;
