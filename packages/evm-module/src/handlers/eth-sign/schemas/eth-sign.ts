import { z } from 'zod';
import { addressSchema, messageSchema } from './shared';
import { RpcMethod } from '@avalabs/vm-module-types';

// https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_sign
export const ethSignSchema = z.object({
  method: z.literal(RpcMethod.ETH_SIGN),
  params: z.tuple([addressSchema, messageSchema]),
});
