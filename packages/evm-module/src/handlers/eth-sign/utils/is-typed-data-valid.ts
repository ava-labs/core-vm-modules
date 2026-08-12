import { type TypedData, type MessageTypes, type TypedDataV1 } from '@avalabs/vm-module-types';
import { TypedDataEncoder } from 'ethers';
import { findEip712TypeMismatches, findEip712V1TypeMismatches } from './eip712-type-check';

type Result = { isValid: true } | { isValid: false; error: unknown; blocking: boolean };

export const isTypedDataValid = (data: TypedData<MessageTypes>): Result => {
  // Check for type mismatches in the message fields, which is a blocking error.
  const typeMismatches = findEip712TypeMismatches(data);

  if (typeMismatches.length > 0) {
    return {
      isValid: false,
      error: new Error(`EIP-712 message contains fields with a type mismatch: ${typeMismatches.join('; ')}`),
      blocking: true,
    };
  }

  try {
    // ethers.js will throw if the message is invalid in any other way (e.g. missing required fields, invalid domain, etc.)
    // remove EIP712Domain from types since ethers.js handles it separately
    const { EIP712Domain, ...types } = data.types;
    TypedDataEncoder.getPayload(data.domain, types, data.message);

    return {
      isValid: true,
    };
  } catch (e) {
    return {
      isValid: false,
      error: e,
      blocking: false,
    };
  }
};

// Check for mismatched types in legacy v1-style typed data
export const isTypedDataV1Valid = (data: TypedDataV1): Result => {
  const typeMismatches = findEip712V1TypeMismatches(data);

  if (typeMismatches.length > 0) {
    return {
      isValid: false,
      error: new Error(`Typed data contains fields with a type mismatch: ${typeMismatches.join('; ')}`),
      blocking: true,
    };
  }

  return { isValid: true };
};
