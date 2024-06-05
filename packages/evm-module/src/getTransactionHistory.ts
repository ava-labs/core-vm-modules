import { getTransactionFromEtherscan } from './etherscanTransactionConverter/getTransactionFromEtherscan';
import { isEthereumChainId } from './utils/isEthereumChainId';
import type { GetTransactionHistory, TransactionHistoryResponse } from '@internal/types';
import { getTransactionsFromGlacier } from './evmTransactionConverter/getTransactionsFromGlacier';

export const getTransactionHistory = async ({
  network,
  address,
  nextPageToken,
  offset,
}: GetTransactionHistory): Promise<TransactionHistoryResponse> => {
  if (isEthereumChainId(network.chainId)) {
    return getTransactionFromEtherscan({
      network,
      address,
      nextPageToken,
      offset,
    });
  }
  return getTransactionsFromGlacier({
    network,
    address,
    nextPageToken,
    offset,
  });
};
