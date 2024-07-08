import { DerivationPath } from '@avalabs/wallets-sdk';
import { TransactionType, type Caip2ChainId, type Hex, type RpcError, type RpcRequest } from '@avalabs/vm-module-types';
import type { TransactionRequest } from 'ethers';
import type { Address } from 'viem';

export const NonContractCallTypes = [TransactionType.SEND, TransactionType.RECEIVE, TransactionType.TRANSFER];

export type DisplayData = {
  title: string;
  chain: {
    name: string;
    logoUrl?: string;
  };
  messageDetails?: string;
  transactionDetails?: {
    website: string;
    from: string;
    to: string;
    data?: string;
  };
  networkFeeSelector?: boolean;
  transactionValidation?: {
    resultType: 'malicious' | 'warning';
    title: string;
    description: string;
    rejectButtonTitle: string;
  };
  transactionSimulation?: Record<string, unknown>;
};

export type SigningData =
  | {
      type: 'transaction';
      account: string;
      chainId: Caip2ChainId;
      derivationPath: DerivationPath;
      data: TransactionRequest;
    }
  | {
      type: 'message';
      account: string;
      chainId: Caip2ChainId;
      derivationPath: DerivationPath;
      data: string;
    };

export type ApprovalParams = {
  request: RpcRequest;
  displayData: DisplayData;
  signingData: SigningData;
};

export type ApprovalResponse =
  | {
      result: Hex;
    }
  | {
      error: RpcError;
    };

export interface ApprovalController {
  requestApproval: (params: ApprovalParams) => Promise<ApprovalResponse>;
  onTransactionConfirmed: (txHash: Hex) => void;
  onTransactionReverted: (txHash: Hex) => void;
}

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
