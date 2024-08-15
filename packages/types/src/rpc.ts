import type { TransactionRequest } from 'ethers';
import type { Avalanche, BitcoinInputUTXO, BitcoinOutputUTXO } from '@avalabs/core-wallets-sdk';
import type { Caip2ChainId, Hex } from './common';
import type { JsonRpcError, EthereumProviderError, OptionalDataWithOptionalCause } from '@metamask/rpc-errors';
import type { BalanceChange, TokenApprovals } from './transaction-simulation';
import type { StakingDetails, ExportImportTxDetails, ChainDetails, BlockchainDetails, SubnetDetails } from './staking';
import type { TokenWithBalanceBTC } from './balance';

export enum RpcMethod {
  /* BTC */
  BITCOIN_SEND_TRANSACTION = 'bitcoin_sendTransaction',

  /* EVM */
  ETH_SEND_TRANSACTION = 'eth_sendTransaction',
  SIGN_TYPED_DATA_V3 = 'eth_signTypedData_v3',
  SIGN_TYPED_DATA_V4 = 'eth_signTypedData_v4',
  SIGN_TYPED_DATA_V1 = 'eth_signTypedData_v1',
  SIGN_TYPED_DATA = 'eth_signTypedData',
  PERSONAL_SIGN = 'personal_sign',
  ETH_SIGN = 'eth_sign',

  /* AVALANCHE */
  AVALANCHE_SIGN_MESSAGE = 'avalanche_signMessage',
  AVALANCHE_SEND_TRANSACTION = 'avalanche_sendTransaction',
  AVALANCHE_SIGN_TRANSACTION = 'avalanche_signTransaction',
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

export type TransactionDetails = {
  website: string;
  from: string;
  to: string;
  data?: string;
  type?: string;
};

export type DisplayData = {
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
  transactionDetails?: TransactionDetails | ExportImportTxDetails;
  stakingDetails?: StakingDetails;
  chainDetails?: ChainDetails;
  blockchainDetails?: BlockchainDetails;
  subnetDetails?: SubnetDetails;
  networkFeeSelector?: boolean;
  disclaimer?: string;
  alert?: Alert;
  balanceChange?: BalanceChange;
  tokenApprovals?: TokenApprovals;
};

export enum AlertType {
  WARNING = 'Warning',
  DANGER = 'Danger',
  INFO = 'Info',
}

export type AlertDetails = {
  title: string;
  description: string;
  detailedDescription?: string;
  actionTitles?: {
    proceed: string;
    reject: string;
  };
};

export type Alert = {
  type: AlertType;
  details: AlertDetails;
};

type BitcoinTransactionData = {
  to: string;
  amount: number;
  feeRate: number;
  fee: number;
  balance: TokenWithBalanceBTC;
  inputs: BitcoinInputUTXO[];
  outputs: BitcoinOutputUTXO[];
};

export type SigningData =
  | {
      type: RpcMethod.BITCOIN_SEND_TRANSACTION;
      account: string;
      data: BitcoinTransactionData;
    }
  | {
      type: RpcMethod.ETH_SEND_TRANSACTION;
      account: string;
      data: TransactionRequest;
    }
  | {
      type: RpcMethod.ETH_SIGN | RpcMethod.PERSONAL_SIGN;
      account: string;
      data: string;
    }
  | {
      type: RpcMethod.SIGN_TYPED_DATA | RpcMethod.SIGN_TYPED_DATA_V1;
      account: string;
      data: TypedData<MessageTypes> | TypedDataV1;
    }
  | {
      type: RpcMethod.SIGN_TYPED_DATA_V3 | RpcMethod.SIGN_TYPED_DATA_V4;
      account: string;
      data: TypedData<MessageTypes>;
    }
  | {
      type: RpcMethod.AVALANCHE_SIGN_MESSAGE;
      data: string;
      accountIndex?: number;
    }
  | {
      type: RpcMethod.AVALANCHE_SEND_TRANSACTION;
      unsignedTxJson: string;
      data: Avalanche.Tx;
      vm: 'EVM' | 'AVM' | 'PVM';
    }
  | {
      type: RpcMethod.AVALANCHE_SIGN_TRANSACTION;
      unsignedTxJson: string;
      data: Avalanche.Tx;
      vm: 'EVM' | 'AVM' | 'PVM';
      ownSignatureIndices: [number, number][];
    };

export type ApprovalParams = {
  request: RpcRequest;
  displayData: DisplayData;
  signingData: SigningData;
};

/**
 * We want to accept both a signed data (tx/message) and a tx hash as a response
 * coming in from the client apps, hence the XORs here.
 *
 * The reason we need to support both is because extension allows importing
 * external software wallets, such as Fireblocks or other apps that support
 * the WalletConnect protocol.
 *
 * My experience is that WalletConnect apps rarely, if ever, support
 * "eth_signTransaction" requests and more often only allow sending
 * "eth_sendTransaction" calls, which means that all we'll get in response
 * from them is the transaction hash (not a signed tx).
 */
export type SigningResult = { signedData: string } | { txHash: string };

export type ApprovalResponse =
  | {
      error: RpcError;
    }
  | SigningResult;

export interface ApprovalController {
  requestApproval: (params: ApprovalParams) => Promise<ApprovalResponse>;
  onTransactionConfirmed: (txHash: Hex) => void;
  onTransactionReverted: (txHash: Hex) => void;
}
