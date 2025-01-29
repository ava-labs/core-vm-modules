import { z } from 'zod';
import { transactionSchema } from '../../utils/transaction-schema';

export const transactionBatchSchema = z
  .tuple([transactionSchema, transactionSchema])
  .rest(transactionSchema)
  .refine((transactions) => areAllEqualByProp(transactions, 'chainId'), {
    message: 'All transactions must use the same "chainId"',
  })
  .refine((transactions) => areAllEqualByProp(transactions, 'from'), {
    message: 'All transactions must use the same "from" address',
  })
  .refine((transactions) => areAllEmptyByProp(transactions, 'nonce') || areAllDifferentByProp(transactions, 'nonce'), {
    message: `Each transaction needs a different "nonce". Make them different, or leave them empty for all transactions.`,
  });

function areAllDifferentByProp<T>(elements: T[], prop: keyof T) {
  return !areAllEqualByProp(elements, prop);
}

function areAllEmptyByProp<T>(elements: T[], prop: keyof T) {
  return elements.every((el) => el[prop] === undefined || el[prop] === '');
}

function areAllEqualByProp<T>(elements: T[], prop: keyof T) {
  const uniqValues = new Set(elements.map((el) => el[prop]));

  return uniqValues.size === 1;
}

export const parseRequestParams = (params: unknown) => {
  return transactionBatchSchema.safeParse(params);
};
