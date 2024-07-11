import { TransactionType } from '@avalabs/vm-module-types';

export const NonContractCallTypes = [TransactionType.SEND, TransactionType.RECEIVE, TransactionType.TRANSFER];

export type TransactionParams = {
  from: string;
  to: string;
  data?: string;
  value?: string;
  gas?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: string;
  chainId?: string;
};
