import { Erc20TransferDetails, NativeTransaction, RichAddress, TransactionDetails } from '@avalabs/glacier-sdk';
import { Network } from '@avalabs/chains-sdk';

export interface EtherscanPagination {
  queries: ('normal' | 'erc20')[];
  page?: number;
}

export type GetTransactionHistory = {
  network: Network;
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

export enum TransactionType {
  BRIDGE = 'Bridge',
  SWAP = 'Swap',
  SEND = 'Send',
  RECEIVE = 'Receive',
  NFT_BUY = 'NFTBuy',
  APPROVE = 'Approve',
  TRANSFER = 'Transfer',
  UNKNOWN = 'UNKNOWN',
}

export type ConvertTransactionParams = {
  transactions: TransactionDetails;
  network: Network;
  address: string;
};

export type ConvertTransactionWithERC20Params = {
  nativeTransaction: NativeTransaction;
  erc20Transfer: Erc20TransferDetails;
  network: Network;
  address: string;
};

export type ConvertNativeTransactionParams = {
  nativeTransaction: NativeTransaction;
  network: Network;
  address: string;
};

export enum TokenType {
  NATIVE = 'NATIVE',
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  ERC1155 = 'ERC1155',
}

export interface TxHistoryCategories {
  isSwap: boolean;
  isNativeSend: boolean;
  isNativeReceive: boolean;
  isNFTPurchase: boolean;
  isApprove: boolean;
  isTransfer: boolean;
  isAirdrop: boolean;
  isUnwrap: boolean;
  isFillOrder: boolean;
  isContractCall: boolean;
  method: string;
  txType: TransactionType;
}

export const NonContractCallTypes = [
  TransactionType.BRIDGE,
  TransactionType.SEND,
  TransactionType.RECEIVE,
  TransactionType.TRANSFER,
];
