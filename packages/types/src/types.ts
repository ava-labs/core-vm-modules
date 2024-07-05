import { object, string, boolean, z } from 'zod';
import type { JsonRpcError, EthereumProviderError, OptionalDataWithOptionalCause } from '@metamask/rpc-errors';

export enum TransactionType {
  BRIDGE = 'Bridge',
  SWAP = 'Swap',
  SEND = 'Send',
  RECEIVE = 'Receive',
  NFT_BUY = 'NFTBuy',
  APPROVE = 'Approve',
  TRANSFER = 'Transfer',
  NFT_SEND = 'NFTSend',
  NFT_RECEIVE = 'NFTReceive',
  AIRDROP = 'Airdrop',
  FILL_ORDER = 'FillOrder',
  UNWRAP = 'Unwrap',
  UNKNOWN = 'UNKNOWN',
}

export enum TokenType {
  NATIVE = 'NATIVE',
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  ERC1155 = 'ERC1155',
}

export type NetworkFees = {
  low: { maxPriorityFeePerGas: bigint; maxFeePerGas: bigint };
  medium: { maxPriorityFeePerGas: bigint; maxFeePerGas: bigint };
  high: { maxPriorityFeePerGas: bigint; maxFeePerGas: bigint };
  baseFee: bigint;
};

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

export type Network = {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  networkToken: NetworkToken;
  utilityAddresses?: {
    multicall: string;
  };
  logoUrl?: string;
  isTestnet?: boolean;
  explorerUrl?: string;
};

export interface Module {
  getManifest: () => Manifest | undefined;
  getBalances: () => Promise<string>;
  getTransactionHistory: (params: GetTransactionHistory) => Promise<TransactionHistoryResponse>;
  getNetworkFee: (network: Network) => Promise<NetworkFees>;
  getAddress: () => Promise<string>;
  getTokens: (network: Network) => Promise<NetworkContractToken[]>;
  onRpcRequest: (request: RpcRequest, chain: Network) => Promise<RpcResponse>;
}

export type GetTransactionHistory = {
  network: Network;
  address: string;
  nextPageToken?: string;
  offset?: number;
};

export type TransactionHistoryResponse = {
  transactions: Transaction[];
  nextPageToken?: string;
};

export type Transaction = {
  isContractCall: boolean;
  isIncoming: boolean;
  isOutgoing: boolean;
  isSender: boolean;
  timestamp: number;
  hash: string;
  from: string;
  to: string;
  tokens: TxToken[];
  gasPrice?: string;
  gasUsed: string;
  txType?: TransactionType;
  chainId: string; // chainId from ActiveNetwork used to fetch tx
  method?: string;
  explorerLink: string;
};

export interface TxToken {
  decimal?: string;
  name: string;
  symbol: string;
  amount: string;
  imageUri?: string;
  from?: RichAddress;
  to?: RichAddress;
  collectableTokenId?: string;
  type: TokenType;
}

type RichAddress = {
  /**
   * The contract name.
   */
  name?: string;
  /**
   * The contract symbol.
   */
  symbol?: string;
  /**
   * The number of decimals the token uses. For example `6`, means to divide the token amount by `1000000` to get its user representation.
   */
  decimals?: number;
  /**
   * The logo uri for the address.
   */
  logoUri?: string;
  /**
   * A wallet or contract address in mixed-case checksum encoding.
   */
  address: string;
};

export interface NetworkToken {
  name: string;
  symbol: string;
  description: string;
  decimals: number;
  logoUri: string;
}

export interface NetworkContractToken {
  address: string;
  chainId?: number;
  color?: string;
  contractType: string;
  decimals: number;
  logoUri?: string;
  name: string;
  symbol: string;
}

const sourceSchema = object({
  checksum: string(),
  location: object({
    npm: object({
      filePath: string(),
      packageName: string(),
      registry: string(),
    }),
  }),
});

const manifestSchema = object({
  name: string(),
  version: string(),
  description: string(),
  sources: object({
    module: sourceSchema,
    provider: sourceSchema.optional(),
  }),
  network: object({
    chainIds: string().array(),
    namespaces: string().array(),
  }),
  cointype: string(),
  permissions: object({
    rpc: object({
      dapps: boolean(),
      methods: string().array(),
    }),
  }),
  manifestVersion: string(),
});

export type Manifest = z.infer<typeof manifestSchema>;

export const parseManifest = (params: unknown): z.SafeParseReturnType<unknown, Manifest> => {
  return manifestSchema.safeParse(params);
};

export type Caip2ChainId = string;

export type Hex = `0x${string}`;

export enum Environment {
  PRODUCTION = 'production',
  DEV = 'dev',
}
