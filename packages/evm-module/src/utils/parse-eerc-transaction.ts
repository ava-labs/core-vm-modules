import { Interface } from 'ethers';

import { EERC_ABI } from './eerc-abi';

export enum EercOperation {
  REGISTER = 'register',
  DEPOSIT = 'deposit',
  TRANSFER = 'transfer',
  WITHDRAW = 'withdraw',
  PRIVATE_MINT = 'privateMint',
  SET_AUDITOR_PUBLIC_KEY = 'setAuditorPublicKey',
}

const eercInterface = new Interface(EERC_ABI);

/**
 * Recognizes an eERC (Encrypted ERC) transaction by matching its 4-byte function
 * selector against the bundled eERC ABI. Recognition is interface-based and
 * address-agnostic (there is no canonical eERC contract registry) and performs no
 * network calls. A selector match is a decode hint, not a trust signal.
 */
export const parseEercTransaction = (transaction: {
  data?: string;
  value?: string;
}): { operation: EercOperation } | undefined => {
  if (!transaction.data || transaction.data === '0x') {
    return undefined;
  }

  try {
    const description = eercInterface.parseTransaction({
      data: transaction.data,
      value: transaction.value,
    });

    const functionName = description?.name ?? description?.fragment?.name;

    if (functionName && isEercOperation(functionName)) {
      return { operation: functionName };
    }

    return undefined;
  } catch {
    return undefined;
  }
};

function isEercOperation(value: string): value is EercOperation {
  return Object.values(EercOperation).includes(value as EercOperation);
}
