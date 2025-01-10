import { z } from 'zod';

import { transactionSchema } from '../../utils/transaction-schema';

const paramsSchema = z.tuple([transactionSchema]);

export const parseRequestParams = (params: unknown) => {
  return paramsSchema.safeParse(params);
};
