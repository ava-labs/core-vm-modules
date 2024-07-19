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

export interface MessageTypeProperty {
  name: string;
  type: string;
}

export interface MessageTypes {
  EIP712Domain: MessageTypeProperty[];
  [additionalProperties: string]: MessageTypeProperty[];
}

export interface TypedData<T extends MessageTypes> {
  types: T;
  primaryType: keyof T;
  domain: Record<string, unknown>;
  message: Record<string, unknown>;
}

export type TypedDataV1 = { name: string; type: string; value: unknown }[];

export enum BannerType {
  WARNING = 'warning',
  INFO = 'info',
}

export type Banner = {
  type: BannerType;
  title: string;
  description: string;
  detailedDescription?: string;
};

export type DisplayData = {
  banner?: Banner;
  title: string;
  dAppInfo?: {
    name: string;
    action: string;
    logoUri?: string;
  };
  network: {
    chainId: number;
    name: string;
    logoUri?: string;
  };
  account?: string;
  messageDetails?: string;
  transactionDetails?: {
    website: string;
    from: string;
    to: string;
    data?: string;
  };
  networkFeeSelector?: boolean;
  disclaimer?: string;
};

export type SigningData =
  | {
      type: RpcMethod.ETH_SEND_TRANSACTION;
      account: string;
      chainId: number;
      data: TransactionRequest;
    }
  | {
      type: RpcMethod.ETH_SIGN | RpcMethod.PERSONAL_SIGN;
      account: string;
      chainId: number;
      data: string;
    }
  | {
      type: RpcMethod.SIGN_TYPED_DATA | RpcMethod.SIGN_TYPED_DATA_V1;
      account: string;
      chainId: number;
      data: TypedData<MessageTypes> | TypedDataV1;
    }
  | {
      type: RpcMethod.SIGN_TYPED_DATA_V3 | RpcMethod.SIGN_TYPED_DATA_V4;
      account: string;
      chainId: number;
      data: TypedData<MessageTypes>;
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
