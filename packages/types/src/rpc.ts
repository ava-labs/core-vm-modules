import type { TransactionRequest } from 'ethers';
import type { Avalanche, BitcoinInputUTXO, BitcoinOutputUTXO } from '@avalabs/core-wallets-sdk';
import type { Caip2ChainId, Hex } from './common';
import type { JsonRpcError, EthereumProviderError, OptionalDataWithOptionalCause } from '@metamask/rpc-errors';
import type { BalanceChange, TokenApprovals } from './transaction-simulation';
import type { TokenWithBalanceBTC } from './balance';
import type { TransactionPayload, VMABI } from 'hypersdk-client';

export enum RpcMethod {
  /* BTC */
  BITCOIN_SEND_TRANSACTION = 'bitcoin_sendTransaction',
  BITCOIN_SIGN_TRANSACTION = 'bitcoin_signTransaction',

  /* EVM */
  ETH_SEND_TRANSACTION = 'eth_sendTransaction',
  ETH_SEND_TRANSACTION_BATCH = 'eth_sendTransactionBatch',
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

  /* HVM */
  HVM_SIGN_TRANSACTION = 'hvm_signTransaction',

  /* SOLANA */
  SOLANA_SIGN_TRANSACTION = 'solana_signTransaction',
  SOLANA_SIGN_AND_SEND_TRANSACTION = 'solana_signAndSendTransaction',
  SOLANA_SIGN_MESSAGE = 'solana_signMessage',
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

export type DetailSection = {
  title?: string;
  items: DetailItem[];
};

export type BaseDetailItem = {
  label: string;
};

export enum DetailItemType {
  TEXT = 'text',
  ADDRESS = 'address',
  ADDRESS_LIST = 'addressList',
  NODE_ID = 'nodeID',
  CURRENCY = 'currency',
  FUNDS_RECIPIENT = 'fundsRecipient',
  DATA = 'data',
  DATE = 'date',
  LINK = 'link',
  NETWORK = 'network',
}

// It's very similar as CurrencyItem, but we want the client apps
// to treat the label as an address (recognize it if possible,
// truncate otherwise).
export type FundsRecipientItem = BaseDetailItem & {
  type: DetailItemType.FUNDS_RECIPIENT;
  amount: bigint;
  maxDecimals: number;
  symbol: string;
};

export type TextItem = BaseDetailItem & {
  type: DetailItemType.TEXT;
  value: string;
  alignment: 'vertical' | 'horizontal';
};

export type AddressItem = BaseDetailItem & {
  type: DetailItemType.ADDRESS;
  value: string;
};

export type AddressListItem = BaseDetailItem & {
  type: DetailItemType.ADDRESS_LIST;
  value: string[];
};

export type NodeIDItem = BaseDetailItem & {
  type: DetailItemType.NODE_ID;
  value: string;
};

export type CurrencyItem = BaseDetailItem & {
  type: DetailItemType.CURRENCY;
  value: bigint;
  maxDecimals: number;
  symbol: string;
};

export type DataItem = BaseDetailItem & {
  type: DetailItemType.DATA;
  value: string;
};

export type DateItem = BaseDetailItem & {
  type: DetailItemType.DATE;
  value: string;
};

export type LinkItemValue = { url: string; name?: string; icon?: string };

export type LinkItem = BaseDetailItem & {
  type: DetailItemType.LINK;
  value: LinkItemValue;
};

export type NetworkItemValue = {
  logoUri: string | undefined;
  name: string;
};

export type NetworkItem = BaseDetailItem & {
  type: DetailItemType.NETWORK;
  value: NetworkItemValue;
};

export type DetailItem =
  | string
  | TextItem
  | AddressItem
  | AddressListItem
  | NodeIDItem
  | CurrencyItem
  | DataItem
  | DateItem
  | LinkItem
  | FundsRecipientItem
  | NetworkItem;

export type DisplayData = {
  title: string;
  dAppInfo?: {
    name: string;
    action: string;
    logoUri?: string;
  };
  network?: {
    chainId: number;
    name: string;
    logoUri?: string;
  };
  account?: string;
  details: DetailSection[];
  networkFeeSelector?: boolean;
  alert?: Alert;
  balanceChange?: BalanceChange;
  tokenApprovals?: TokenApprovals;
  isSimulationSuccessful?: boolean;
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

export type BitcoinExecuteTxData = {
  to: string;
  amount: number;
  feeRate: number;
  fee: number;
  gasLimit: number;
  balance: TokenWithBalanceBTC;
  inputs: BitcoinInputUTXO[];
  outputs: BitcoinOutputUTXO[];
};

export type BitcoingSignTxData = {
  inputs: BitcoinInputUTXO[];
  outputs: BitcoinOutputUTXO[];
};

export type SigningData =
  | {
      type: RpcMethod.SOLANA_SIGN_AND_SEND_TRANSACTION;
      account: string;
      data: string; // Base-64 encoded "Wire Transaction"
    }
  | {
      type: RpcMethod.SOLANA_SIGN_TRANSACTION;
      account: string;
      data: string; // Base-64 encoded "Wire Transaction"
    }
  | {
      type: RpcMethod.SOLANA_SIGN_MESSAGE;
      account: string;
      data: string; // Base-64 encoded message
    }
  | {
      type: RpcMethod.BITCOIN_SEND_TRANSACTION;
      account: string;
      data: BitcoinExecuteTxData;
    }
  | {
      type: RpcMethod.BITCOIN_SIGN_TRANSACTION;
      account: string;
      data: BitcoingSignTxData;
    }
  | SigningData_EthSendTx
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
      externalIndices?: number[];
      internalIndices?: number[];
    }
  | {
      type: RpcMethod.AVALANCHE_SIGN_TRANSACTION;
      unsignedTxJson: string;
      data: Avalanche.Tx;
      vm: 'EVM' | 'AVM' | 'PVM';
      ownSignatureIndices: [number, number][];
    }
  | {
      type: RpcMethod.HVM_SIGN_TRANSACTION;
      data: {
        abi: VMABI;
        txPayload: TransactionPayload;
      };
    };

export type SigningData_EthSendTx = {
  type: RpcMethod.ETH_SEND_TRANSACTION;
  account: string;
  data: TransactionRequest;
};

export type EvmTxBatchUpdateFn = (
  data: { maxFeeRate?: bigint; maxTipRate?: bigint },
  txIndex: number,
) => {
  displayData: DisplayData;
  signingRequests: {
    displayData: DisplayData;
    signingData: SigningData_EthSendTx;
  }[];
};

export type EvmTxUpdateFn = (data: {
  maxFeeRate?: bigint;
  maxTipRate?: bigint;
  approvalLimit?: Hex; // as hexadecimal, 0x-prefixed
}) => { displayData: DisplayData; signingData: SigningData_EthSendTx };

export type BtcTxUpdateFn = (data: { feeRate?: number }) => {
  displayData: DisplayData;
  signingData: Extract<SigningData, { type: RpcMethod.BITCOIN_SEND_TRANSACTION }>;
};

export type SigningRequest<Data = SigningData> = {
  displayData: DisplayData;
  signingData: Data;
  updateTx?: EvmTxUpdateFn | BtcTxUpdateFn;
};

export type ApprovalParams = {
  request: RpcRequest;
} & SigningRequest;

export type BatchApprovalParams = {
  request: RpcRequest;
  signingRequests: SigningRequest<SigningData_EthSendTx>[];
  displayData: DisplayData;
  updateTx: EvmTxBatchUpdateFn;
};

export type RequestPublicKeyParams = {
  secretId: string;
  curve: 'secp256k1' | 'ed25519';
  derivationPath?: string;
  accountIndex?: number;
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
type SignedData = { signedData: string };
type BroadcastedTx = { txHash: string };

export type SigningResult = SignedData | BroadcastedTx;

export type ApprovalResponse =
  | {
      error: RpcError;
    }
  | SigningResult;

export type BatchApprovalResponse =
  | { error: RpcError }
  | {
      result: SignedData[];
    };
export interface ApprovalController {
  requestApproval: (params: ApprovalParams) => Promise<ApprovalResponse>;
  requestPublicKey: (params: RequestPublicKeyParams) => Promise<string>;
  onTransactionPending: ({ txHash, request }: { txHash: Hex; request: RpcRequest }) => void;
  onTransactionConfirmed: ({
    txHash,
    explorerLink,
    request,
  }: {
    txHash: Hex;
    explorerLink: string;
    request: RpcRequest;
  }) => void;
  onTransactionReverted: ({ txHash, request }: { txHash: Hex; request: RpcRequest }) => void;
}

export interface BatchApprovalController extends ApprovalController {
  requestBatchApproval: (params: BatchApprovalParams) => Promise<BatchApprovalResponse>;
}
