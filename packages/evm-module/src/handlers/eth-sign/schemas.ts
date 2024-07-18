import { z } from 'zod';

const messageSchema = z.string().describe('message');

const addressSchema = z.string().describe('address');

// https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_sign
export const ethSignSchema = z.tuple([addressSchema, messageSchema]);
