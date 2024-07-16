import { getTransactionFromEtherscan } from './converters/etherscan-transaction-converter/get-transaction-from-etherscan';
import { isEthereumChainId } from './utils/is-ethereum-chain-id';
import type { NetworkToken, TransactionHistoryResponse } from '@avalabs/vm-module-types';
import { getTransactionsFromGlacier } from './converters/evm-transaction-converter/get-transactions-from-glacier';
import type { GlacierService } from '@internal/utils';

export const getTransactionHistory = async ({
  chainId,
  isTestnet,
  networkToken,
  explorerUrl,
  address,
  nextPageToken,
  offset,
  glacierService,
}: {
  chainId: number;
  isTestnet?: boolean;
  networkToken: NetworkToken;
  explorerUrl: string;
  address: string;
  nextPageToken?: string;
  offset?: number;
  glacierService: GlacierService;
}): Promise<TransactionHistoryResponse> => {
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
    networkToken,
    explorerUrl,
    chainId,
    address,
    nextPageToken,
    offset,
    glacierService,
  });
};
