import { type TypedData, type MessageTypes } from '@avalabs/vm-module-types';
import { TypedDataEncoder } from 'ethers';

type Result = { isValid: true } | { isValid: false; error: unknown };

export const isTypedDataValid = (data: TypedData<MessageTypes>): Result => {
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
    };
  }
};
