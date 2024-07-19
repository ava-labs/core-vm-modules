import { z } from 'zod';
import { ethSignSchema } from '../eth-sign';
import {
  combinedTypedDataSchema,
  ethSignTypedDataSchema,
  ethSignTypedDataV1Schema,
  ethSignTypedDataV3Schema,
  ethSignTypedDataV4Schema,
  typedDataSchema,
} from '../eth-sign-typed-data';
import { personalSignSchema } from '../personal-sign';
import { RpcMethod } from '@avalabs/vm-module-types';

const paramsSchema = z
  .discriminatedUnion('method', [
    personalSignSchema,
    ethSignSchema,
    ethSignTypedDataSchema,
    ethSignTypedDataV1Schema,
    ethSignTypedDataV3Schema,
    ethSignTypedDataV4Schema,
  ])
  .transform((value, ctx) => {
    const { method, params } = value;

    switch (method) {
      case RpcMethod.PERSONAL_SIGN:
        return {
          data: params[0],
          address: params[1],
          method,
        };
      case RpcMethod.ETH_SIGN:
        return {
          data: params[1],
          address: params[0],
          method,
        };
      case RpcMethod.SIGN_TYPED_DATA:
      case RpcMethod.SIGN_TYPED_DATA_V1: {
        const address = params[0];
        const data = params[1];

        if (typeof data !== 'string') return { data, address, method };

        try {
          const parsed = JSON.parse(data);
          const result = combinedTypedDataSchema.parse(parsed);

          return {
            data: result,
            address,
            method,
          };
        } catch (e) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'param is not a valid json',
          });

          return z.NEVER;
        }
      }
      case RpcMethod.SIGN_TYPED_DATA_V3:
      case RpcMethod.SIGN_TYPED_DATA_V4: {
        const address = params[0];
        const data = params[1];

        if (typeof data !== 'string') return { data, address, method };

        try {
          const parsed = JSON.parse(data);
          const result = typedDataSchema.parse(parsed);

          return {
            data: result,
            address,
            method,
          };
        } catch (e) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'param is not a valid json',
          });

          return z.NEVER;
        }
      }
    }
  });

export function parseRequestParams(params: { method: RpcMethod; params: unknown }) {
  return paramsSchema.safeParse(params);
}
