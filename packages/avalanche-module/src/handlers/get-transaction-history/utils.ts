import {
  PrimaryNetworkChainName,
  type ListCChainAtomicTransactionsResponse,
  type ListPChainTransactionsResponse,
  type ListXChainTransactionsResponse,
} from '@avalabs/glacier-sdk';
import Big from 'big.js';

export const isPChainTransactions = (
  value: ListPChainTransactionsResponse | ListXChainTransactionsResponse | ListCChainAtomicTransactionsResponse,
): value is ListPChainTransactionsResponse => {
  return value.chainInfo.chainName === PrimaryNetworkChainName.P_CHAIN;
};

export const isXChainTransactions = (
  value: ListPChainTransactionsResponse | ListXChainTransactionsResponse | ListCChainAtomicTransactionsResponse,
): value is ListXChainTransactionsResponse => {
  return value.chainInfo.chainName === PrimaryNetworkChainName.X_CHAIN;
};

export function getExplorerAddressByNetwork(
  explorerUrl: string,
  hash: string,
  hashType: 'address' | 'tx' = 'tx',
): string {
  return `${explorerUrl}/${hashType}/${hash}`;
}

export function getTokenValue({ amount, decimals }: { decimals: number; amount?: number }): Big {
  return amount === undefined ? new Big(0) : new Big(amount / 10 ** decimals);
}
