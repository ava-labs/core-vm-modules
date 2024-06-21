import { getTransactionFromEtherscan } from './converters/etherscan-transaction-converter/get-transaction-from-etherscan';
import { isEthereumChainId } from './utils/is-ethereum-chain-id';
import type { GetTransactionHistory, RpcResponse, TransactionHistoryResponse } from '@avalabs/vm-module-types';
import { getTransactionsFromGlacier } from './converters/evm-transaction-converter/get-transactions-from-glacier';

// TODO: https://ava-labs.atlassian.net/browse/CP-8843
// 1/ adjust param to accept request object
// 2/ validate request's params with zod
export const getTransactionHistory = async ({
  chainId,
  isTestnet,
  networkToken,
  explorerUrl,
  address,
  nextPageToken,
  offset,
  glacierApiUrl,
}: GetTransactionHistory): Promise<RpcResponse<TransactionHistoryResponse>> => {
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
