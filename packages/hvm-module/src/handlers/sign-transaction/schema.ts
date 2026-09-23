import { z } from 'zod';

const UINT64_MAX = (1n << 64n) - 1n;

const uint64Schema = z
  .string()
  .regex(/^\d+$/, 'must be an unsigned integer')
  // The regex check does not short-circuit this one, so re-test before converting.
  .refine((value) => /^\d+$/.test(value) && BigInt(value) <= UINT64_MAX, 'must fit in 64 bits');

// Schema for validating the transaction data
const transactionSchema = z.object({
  tx: z
    .object({
      base: z.object({
        timestamp: uint64Schema,
        // Not a uint64: the chain id is marshaled as a uint256, and a 32 byte id does not
        // fit in 64 bits. It is validated by comparing it against the node's own chain id,
        // which also accepts the cb58 form - see parseRequestChainId.
        chainId: z.string(),
        maxFee: uint64Schema,
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
