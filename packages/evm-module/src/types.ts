import type { z } from 'zod';
import { TransactionType } from '@avalabs/vm-module-types';

import type { transactionSchema } from './utils/transaction-schema';
import type { transactionArraySchema } from './handlers/eth-send-transaction-batch/schema';

export const NonContractCallTypes = [TransactionType.SEND, TransactionType.RECEIVE, TransactionType.TRANSFER];

export type TransactionParams = z.infer<typeof transactionSchema>;

export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type TransactionBatchParams = z.infer<typeof transactionArraySchema>;

export enum ERC20TransactionType {
  TOTAL_SUPPLY = 'totalSupply',
  BALANCE_OF = 'balanceOf',
  TRANSFER = 'transfer',
  TRANSFER_FROM = 'transferFrom',
  APPROVE = 'approve',
  ALLOWANCE = 'allowance',
}
