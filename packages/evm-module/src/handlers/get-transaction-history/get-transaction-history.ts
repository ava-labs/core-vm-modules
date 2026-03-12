import { getTransactionFromEtherscan } from './converters/etherscan-transaction-converter/get-transaction-from-etherscan';
import { getTransactionsFromExplorerApi } from './converters/etherscan-transaction-converter/get-transactions-from-explorer-api';
import { isEthereumChainId } from './utils/is-ethereum-chain-id';
import { getExplorerApiUrl } from './utils/explorer-api-urls';
import type { NetworkToken, TransactionHistoryResponse } from '@avalabs/vm-module-types';
import { getTransactionsFromGlacier } from './converters/evm-transaction-converter/get-transactions-from-glacier';
import type { EvmGlacierService } from '../../services/glacier-service/glacier-service';

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
  glacierService: EvmGlacierService;
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

  const explorerApiUrl = getExplorerApiUrl(chainId);
  if (explorerApiUrl) {
    return getTransactionsFromExplorerApi({
      explorerApiUrl,
      networkToken,
      explorerUrl,
      chainId,
      address,
      nextPageToken,
      offset,
    });
  }

  const isHealthy = glacierService.isHealthy();
  if (!isHealthy) {
    return {
      transactions: [],
      nextPageToken: '',
    };
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
