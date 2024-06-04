import { getTransactionFromEtherscan } from './etherscanTransactionConverter/getTransactionFromEtherscan';
import { isEthereumChainId } from './utils/isEthereumChainId';
import { GetTransactionHistory, TransactionHistoryResponse } from './types';
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
