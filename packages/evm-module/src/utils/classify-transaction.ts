import { ERC20TransactionType, TransactionKind } from '../types';
import type { TransactionParams } from './transaction-schema';
import { parseERC20TransactionType } from './parse-erc20-transaction-type';

/**
 * Classifies a transaction as a native transfer, an ERC20 transfer or a generic
 * contract call.
 *
 * This is a calldata-based heuristic:
 * - No calldata → native (value) transfer.
 * - Calldata that decodes as ERC20 `transfer`/`transferFrom` → ERC20 transfer.
 * - Any other calldata → contract call.
 *
 * Note: a matching 4-byte selector doesn't guarantee the `to` is a real ERC20
 * token. Verifying that requires an on-chain lookup (e.g. calling `decimals()`).
 */
export const classifyTransaction = (transaction: Pick<TransactionParams, 'data' | 'value'>): TransactionKind => {
  const hasCallData = Boolean(transaction.data && transaction.data !== '0x');

  if (!hasCallData) {
    return TransactionKind.NATIVE_TRANSFER;
  }

  const erc20Type = parseERC20TransactionType(transaction);
  if (erc20Type === ERC20TransactionType.TRANSFER || erc20Type === ERC20TransactionType.TRANSFER_FROM) {
    return TransactionKind.ERC20_TRANSFER;
  }

  return TransactionKind.CONTRACT_CALL;
};
