import { z } from 'zod';
import { addressSchema } from './shared';
import { RpcMethod } from '@avalabs/vm-module-types';

/**
 * For the different eth_signTypedData methods, the payload differs based on the version.
 *
 * V1 is based upon [an early version of EIP-712](https://github.com/ethereum/EIPs/pull/712/commits/21abe254fe0452d8583d5b132b1d7be87c0439ca)
 * that lacked some later security improvements, and should generally be neglected in favor of
 * later versions.
 *
 * V3 is based on [EIP-712](https://eips.ethereum.org/EIPS/eip-712), except that arrays and
 * recursive data structures are not supported.
 *
 * V4 is based on [EIP-712](https://eips.ethereum.org/EIPS/eip-712), and includes full support of
 * arrays and recursive data structures.
 *
 * References:
 * - https://eips.ethereum.org/EIPS/eip-712#specification-of-the-eth_signtypeddata-json-rpc
 * - https://docs.metamask.io/guide/signing-data.html#signtypeddata-v4
 */
const messageTypeSchema = z.object({ name: z.string(), type: z.string() });

export const typedDataSchema = z.object({
  types: z.object({ EIP712Domain: z.array(messageTypeSchema) }).catchall(z.array(messageTypeSchema)),
  primaryType: z.string(),
  domain: z.record(z.any()),
  message: z.record(z.any()),
});

export const typedDataV1Schema = z
  .array(
    z.object({
      type: z.string(),
      name: z.string(),
      value: z.union([z.string(), z.number(), z.boolean(), z.object({}).passthrough(), z.array(z.unknown()), z.null()]),
    }),
  )
  .nonempty();

export const combinedTypedDataSchema = typedDataSchema.or(typedDataV1Schema);

const dataSchema = z.union([z.string().describe('data string'), typedDataSchema]);

export const combinedDataSchema = z.union([z.string().describe('data string'), combinedTypedDataSchema]);

export const ethSignTypedDataSchema = z.object({
  method: z.literal(RpcMethod.SIGN_TYPED_DATA),
  params: z.tuple([addressSchema, combinedDataSchema]),
});

export const ethSignTypedDataV1Schema = z.object({
  method: z.literal(RpcMethod.SIGN_TYPED_DATA_V1),
  params: z.tuple([addressSchema, combinedDataSchema]),
});

export const ethSignTypedDataV3Schema = z.object({
  method: z.literal(RpcMethod.SIGN_TYPED_DATA_V3),
  params: z.tuple([addressSchema, dataSchema]),
});

export const ethSignTypedDataV4Schema = z.object({
  method: z.literal(RpcMethod.SIGN_TYPED_DATA_V4),
  params: z.tuple([addressSchema, dataSchema]),
});
