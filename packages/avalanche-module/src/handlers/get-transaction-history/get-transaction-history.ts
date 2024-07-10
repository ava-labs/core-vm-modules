import type { GetTransactionHistory, Transaction, TransactionHistoryResponse } from '@avalabs/vm-module-types';
import { BlockchainId, Network, SortOrder, Glacier } from '@avalabs/glacier-sdk';
import { isPChainTransactions, isXChainTransactions } from './utils';
import { convertPChainTransaction } from './convert-p-chain-transaction';
import { convertXChainTransaction } from './convert-x-chain-transaction';

export const getTransactionHistory = async ({
  isTestnet,
  address,
  nextPageToken,
  offset,
  glacierApiUrl,
  networkToken,
  explorerUrl,
  chainId,
}: GetTransactionHistory): Promise<TransactionHistoryResponse> => {
  const glacierSdk = new Glacier({ BASE: glacierApiUrl });

  const response = await glacierSdk.primaryNetworkTransactions.listLatestPrimaryNetworkTransactions({
    addresses: address,
    blockchainId: getBlockchainIdByAddress(address),
    network: isTestnet ? Network.FUJI : Network.MAINNET,
    pageSize: offset,
    pageToken: nextPageToken,
    sortOrder: SortOrder.DESC,
  });

  let transactions: Transaction[] = [];
  if (isPChainTransactions(response)) {
    transactions = response.transactions.map((value) =>
      convertPChainTransaction(value, isTestnet, address, networkToken, explorerUrl, chainId),
    );
  }
  if (isXChainTransactions(response)) {
    transactions = response.transactions.map((value) =>
      convertXChainTransaction(value, isTestnet, address, networkToken, explorerUrl, chainId),
    );
  }

  return {
    transactions,
    nextPageToken: response.nextPageToken,
  };
};

const getBlockchainIdByAddress = (address: string) => {
  // A comma separated list of X-Chain or P-Chain wallet addresses,
  // starting with "avax"/"fuji", "P-avax"/"P-fuji" or "X-avax"/"X-fuji"
  const firstAddress = address.split(',')[0];
  if (firstAddress?.toLowerCase().startsWith('p-')) {
    return BlockchainId.P_CHAIN;
  }
  return BlockchainId.X_CHAIN;
};
