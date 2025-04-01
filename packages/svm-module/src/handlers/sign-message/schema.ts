import { z } from 'zod';

const signMessageSchema = z.object({
  account: z.string(),
  serializedMessage: z.string().base64(),
});

const paramsSchema = z.tuple([signMessageSchema]);

export const parseRequestParams = (params: unknown) => {
  return paramsSchema.safeParse(params);
};

export type SignMessageParams = z.infer<typeof signMessageSchema>;
