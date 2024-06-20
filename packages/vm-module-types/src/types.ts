import type { Manifest } from '@internal/types';

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

export interface Module {
  getManifest: () => Manifest | undefined;
  getBalances: () => Promise<string>;
  getTransactionHistory: (params: GetTransactionHistory) => Promise<TransactionHistoryResponse>;
  getNetworkFee: () => Promise<NetworkFees>;
  getAddress: () => Promise<string>;
}

export type GetTransactionHistory = {
  chainId: number;
  isTestnet: boolean;
  networkToken: NetworkToken;
  explorerUrl: string;
  address: string;
  nextPageToken?: string;
  offset?: number;
  glacierApiUrl?: string;
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

export type { Manifest };
