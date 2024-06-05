import type { Erc20TransferDetails, NativeTransaction, TransactionDetails } from '@avalabs/glacier-sdk';
import type { Network } from '@avalabs/chains-sdk';
import { TransactionType } from '@internal/types';

export interface EtherscanPagination {
  queries: ('normal' | 'erc20')[];
  page?: number;
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
