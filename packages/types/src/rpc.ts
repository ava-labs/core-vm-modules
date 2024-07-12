import type { TransactionRequest } from 'ethers';
import type { Caip2ChainId, Hex } from './common';
import type { JsonRpcError, EthereumProviderError, OptionalDataWithOptionalCause } from '@metamask/rpc-errors';

export enum RpcMethod {
  /* EVM */
  ETH_SEND_TRANSACTION = 'eth_sendTransaction',
  SIGN_TYPED_DATA_V3 = 'eth_signTypedData_v3',
  SIGN_TYPED_DATA_V4 = 'eth_signTypedData_v4',
  SIGN_TYPED_DATA_V1 = 'eth_signTypedData_v1',
  SIGN_TYPED_DATA = 'eth_signTypedData',
  PERSONAL_SIGN = 'personal_sign',
  ETH_SIGN = 'eth_sign',
  WALLET_ADD_ETHEREUM_CHAIN = 'wallet_addEthereumChain',
  WALLET_SWITCH_ETHEREUM_CHAIN = 'wallet_switchEthereumChain',
  WALLET_GET_ETHEREUM_CHAIN = 'wallet_getEthereumChain',
}

export type DappInfo = {
  name: string;
  url: string;
  icon: string;
};

export type RpcRequest = {
  requestId: string;
  sessionId: string;
  method: RpcMethod;
  chainId: Caip2ChainId;
  params: unknown;
  dappInfo: DappInfo;
  context?: Record<string, unknown>; // for storing additional context information that's only relevant to the consumer
};

export type RpcError =
  | JsonRpcError<OptionalDataWithOptionalCause>
  | EthereumProviderError<OptionalDataWithOptionalCause>;

export type RpcResponse<R = unknown, E extends RpcError = JsonRpcError<OptionalDataWithOptionalCause>> =
  | {
      result: R;
    }
  | {
      error: E;
    };

export type DisplayData = {
  title: string;
  network: {
    chainId: number;
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
};

/**
 * Enum for different types of signing data.
 */
export enum SigningDataType {
  // EVM signing data types
  EVM_TRANSACTION = 'evm_transaction',
  EVM_MESSAGE_ETH_SIGN = 'evm_message_eth_sign',
  EVM_MESSAGE_PERSONAL_SIGN = 'evm_message_personal_sign',
  EVM_MESSAGE_ETH_SIGN_TYPED_DATA = 'evm_message_eth_sign_typed_data',
  EVM_MESSAGE_ETH_SIGN_TYPED_DATA_V1 = 'evm_message_eth_sign_typed_data_v1',
  EVM_MESSAGE_ETH_SIGN_TYPED_DATA_V3 = 'evm_message_eth_sign_typed_data_v3',
  EVM_MESSAGE_ETH_SIGN_TYPED_DATA_V4 = 'evm_message_eth_sign_typed_data_v4',

  // Avalanche signing data types
  AVALANCHE_TRANSACTION = 'avalanche_transaction',
  AVALANCHE_MESSAGE = 'avalanche_message',

  // Bitcoin signing data types
  BTC_TRANSACTION = 'btc_transaction',
}

export type SigningData =
  | {
      type: SigningDataType.EVM_TRANSACTION;
      account: string;
      chainId: number;
      data: TransactionRequest;
    }
  | {
      type: SigningDataType.EVM_MESSAGE_ETH_SIGN;
      account: string;
      chainId: number;
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
