import { isAddress } from 'ethers';
import { z } from 'zod';

const HEX_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;

/**
 * EIP-55: an all-lowercase or all-uppercase address carries no checksum and is accepted as is,
 * but a mixed-case address must match its checksum exactly. A wrong checksum usually means a typo
 * or a tampered address, so the request is rejected instead of sending funds to it.
 */
// The regex keeps ethers' isAddress from also accepting un-prefixed and ICAP addresses; isAddress rejects a
// mixed-case address whose checksum is wrong.
export const isValidEip55Address = (address: string): boolean => HEX_ADDRESS_REGEX.test(address) && isAddress(address);

const addressSchema = (field: 'from' | 'to') =>
  z
    .string()
    .length(42)
    .refine((address) => HEX_ADDRESS_REGEX.test(address), {
      message: `'${field}' must be a 0x-prefixed 20-byte hex address`,
    })
    .refine((address) => !HEX_ADDRESS_REGEX.test(address) || isValidEip55Address(address), {
      message: `'${field}' address has an invalid EIP-55 checksum`,
    });

export const transactionSchema = z.object({
  from: addressSchema('from'),
  to: addressSchema('to').optional(),
  data: z.string().optional(),
  value: z.string().startsWith('0x').optional(),
  gas: z.string().startsWith('0x').optional(),
  gasPrice: z.string().startsWith('0x').optional(),
  maxFeePerGas: z.string().startsWith('0x').optional(),
  maxPriorityFeePerGas: z.string().startsWith('0x').optional(),
  nonce: z.string().optional(),
  chainId: z.string().optional().or(z.number().optional()),
  accessList: z
    .array(
      z.object({
        address: z.string().startsWith('0x'),
        storageKeys: z.array(z.string()),
      }),
    )
    .optional(),
});

export type TransactionParams = z.infer<typeof transactionSchema>;
