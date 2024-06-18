import { getTransactionFromEtherscan } from './converters/etherscan-transaction-converter/get-transaction-from-etherscan';
import { isEthereumChainId } from './utils/is-ethereum-chain-id';
import type { GetTransactionHistory, TransactionHistoryResponse } from '@internal/types';
import { getTransactionsFromGlacier } from './converters/evm-transaction-converter/get-transactions-from-glacier';

export const getTransactionHistory = async ({
  chainId,
  isTestnet,
  networkToken,
  explorerUrl,
  address,
  nextPageToken,
  offset,
  glacierApiUrl,
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
    glacierApiUrl,
  });
};
