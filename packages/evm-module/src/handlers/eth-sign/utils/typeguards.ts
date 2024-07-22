import type { TypedDataV1, TypedData, MessageTypes } from '@avalabs/vm-module-types';
import { typedDataSchema, typedDataV1Schema } from '../schemas/eth-sign-typed-data';

export const isTypedDataV1 = (data: unknown): data is TypedDataV1 => {
  return typedDataV1Schema.safeParse(data).success;
};

export const isTypedData = (data: unknown): data is TypedData<MessageTypes> => {
  return typedDataSchema.safeParse(data).success;
};
