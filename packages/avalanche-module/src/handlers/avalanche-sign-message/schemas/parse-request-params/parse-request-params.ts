import { z } from 'zod';

const paramsSchema = z.tuple([
  z.string().describe('message to sign'),
  z.number().nonnegative().describe('account index'),
  z.enum(['X', 'P', 'C']),
]);

export const parseRequestParams = (
  params: unknown,
): z.SafeParseReturnType<[string, number, 'X' | 'P' | 'C'], [string, number, 'X' | 'P' | 'C']> => {
  return paramsSchema.safeParse(params);
};
