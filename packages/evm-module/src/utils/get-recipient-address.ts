import { Interface } from 'ethers';
import ERC20 from '@openzeppelin/contracts/build/contracts/ERC20.json';

import { ERC20TransactionType } from '../types';
import type { TransactionParams } from './transaction-schema';

/**
 * Resolves the actual recipient of a transaction.
 *
 * For native transfers the recipient is the transaction's `to` field. For ERC20
 * `transfer`/`transferFrom` calls the `to` field is the token contract, so the real
 * recipient has to be decoded from the calldata using the ERC20 ABI.
 */
export const getRecipientAddress = (
  transaction: Pick<TransactionParams, 'to' | 'data' | 'value'>,
): string | undefined => {
  if (transaction.data) {
    try {
      const iface = new Interface(ERC20.abi);
      const parsed = iface.parseTransaction({ data: transaction.data, value: transaction.value });
      const functionName = parsed?.name ?? parsed?.fragment?.name;

      if (functionName === ERC20TransactionType.TRANSFER || functionName === ERC20TransactionType.TRANSFER_FROM) {
        const recipient = parsed?.args['to'];
        if (typeof recipient === 'string') {
          return recipient;
        }
      }
    } catch {
      // Not a parseable ERC20 call; fall back to the transaction's `to`.
    }
  }

  return transaction.to;
};
