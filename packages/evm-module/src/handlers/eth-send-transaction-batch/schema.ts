import { z } from 'zod';
import { transactionSchema } from '../../utils/transaction-schema';

export const transactionArraySchema = z
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

export const batchOptionsSchema = z.object({
  /**
   * When true, skips waiting for intermediate transaction receipts.
   * All transactions are broadcasted immediately without waiting for each to confirm.
   *
   * This is useful for one-click swaps (approve + swap) where we want fast response.
   * The network guarantees ordering via sequential nonces.
   *
   * Default: false (wait for each transaction's receipt before broadcasting the next)
   */
  skipIntermediateTxs: z.boolean().optional(),
});

export type BatchOptions = z.infer<typeof batchOptionsSchema>;

/**
 * Support both legacy array format and new object format with options:
 * - Legacy: [tx1, tx2, ...]
 * - New: { transactions: [tx1, tx2, ...], options?: { onlyWaitForLastTx?: boolean } }
 */
export const transactionBatchSchema = z.union([
  transactionArraySchema,
  z.object({
    transactions: transactionArraySchema,
    options: batchOptionsSchema.optional(),
  }),
]);

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

/** Input type for batch transaction params - either array or object format */
export type TransactionBatchInput = z.input<typeof transactionBatchSchema>;

/** Normalized output after parsing - always has transactions, options is optional */
export type ParsedParams = {
  transactions: z.infer<typeof transactionArraySchema>;
  options?: BatchOptions;
};

export const parseRequestParams = (params: unknown): z.SafeParseReturnType<TransactionBatchInput, ParsedParams> => {
  const result = transactionBatchSchema.safeParse(params);

  if (!result.success) {
    return result;
  }

  // Normalize to the new format
  if (Array.isArray(result.data)) {
    return {
      success: true,
      data: {
        transactions: result.data,
        options: {},
      },
    };
  }

  return {
    success: true,
    data: {
      transactions: result.data.transactions,
      options: result.data.options ?? {},
    },
  };
};
