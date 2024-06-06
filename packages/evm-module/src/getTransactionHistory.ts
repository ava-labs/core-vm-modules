import { getTransactionFromEtherscan } from './etherscanTransactionConverter/getTransactionFromEtherscan';
import { isEthereumChainId } from './utils/isEthereumChainId';
import type { GetTransactionHistory, TransactionHistoryResponse } from '@internal/types';
import { getTransactionsFromGlacier } from './evmTransactionConverter/getTransactionsFromGlacier';

export const getTransactionHistory = async ({
  chainId,
  isTestnet,
  networkToken,
  explorerUrl,
  address,
  nextPageToken,
  offset,
}: GetTransactionHistory): Promise<TransactionHistoryResponse> => {
  if (isEthereumChainId(chainId)) {
    return getTransactionFromEtherscan({
      isTestnet,
      networkToken,
      explorerUrl,
      chainId,
      address,
      nextPageToken,
      offset,
    });
  }
  return getTransactionsFromGlacier({
    isTestnet,
    networkToken,
    explorerUrl,
    chainId,
    address,
    nextPageToken,
    offset,
  });
};
