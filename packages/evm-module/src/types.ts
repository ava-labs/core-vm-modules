import { TransactionType } from '@avalabs/vm-module-types';

export const NonContractCallTypes = [TransactionType.SEND, TransactionType.RECEIVE, TransactionType.TRANSFER];

export type TransactionParams = {
  from: string;
  to?: string;
  data?: string;
  value?: string;
  gas?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: string;
  chainId?: string | number;
};

export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

export enum ERC20TransactionType {
  TOTAL_SUPPLY = 'totalSupply',
  BALANCE_OF = 'balanceOf',
  TRANSFER = 'transfer',
  TRANSFER_FROM = 'transferFrom',
  APPROVE = 'approve',
  ALLOWANCE = 'allowance',
}
