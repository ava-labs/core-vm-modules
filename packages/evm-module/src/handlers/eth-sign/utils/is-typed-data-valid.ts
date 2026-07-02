import { type TypedData, type MessageTypes, type TypedDataV1 } from '@avalabs/vm-module-types';
import { TypedDataEncoder } from 'ethers';
import { findEip712TypeMismatches, findEip712V1TypeMismatches } from './eip712-type-check';

type Result = { isValid: true } | { isValid: false; error: unknown; blocking: boolean };

export const isTypedDataValid = (data: TypedData<MessageTypes>): Result => {
  // A value whose runtime type doesn't match its declared Solidity type (e.g. the string
  // "false" for a `bool` field) is not a benign dApp mistake: the approval UI displays the
  // raw value while the signing library independently coerces it, so the signed digest can
  // authorize something different from what the user reviewed and approved. This must block
  // the request outright rather than fall through to the compatibility path below.
  const typeMismatches = findEip712TypeMismatches(data);

  if (typeMismatches.length > 0) {
    return {
      isValid: false,
      error: new Error(`EIP-712 message contains fields with a type mismatch: ${typeMismatches.join('; ')}`),
      blocking: true,
    };
  }

  try {
    // getPayload verifies the types and the content of the message throwing an error if the data is not valid.
    // We don't want to immediately reject the request even if there are errors for compatiblity reasons.
    // dApps tend to make small mistakes in the message format like leaving the verifyingContract emptry,
    // in which cases we should be able to continue just like other wallets do (even if it's technically incorrect).

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

// Legacy V1 typed data has no `types` registry or ethers-based validator to fall back on,
// so any type mismatch here is always blocking - see findEip712V1TypeMismatches.
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
