import { TransactionType, type Caip2ChainId } from '@avalabs/vm-module-types';
import type { Address } from 'viem';

export const NonContractCallTypes = [TransactionType.SEND, TransactionType.RECEIVE, TransactionType.TRANSFER];

export type ProviderParams = {
  glacierApiKey?: string;
  chainId: Caip2ChainId;
  chainName: string;
  rpcUrl: string;
  multiContractAddress?: Address;
};

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
