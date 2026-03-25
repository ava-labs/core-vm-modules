import { getTransactionsFromMoralis } from './converters/moralis-transaction-converter/get-transactions-from-moralis';
import { isMoralisSupportedChain } from './utils/moralis-chain-ids';
import type { NetworkToken, TransactionHistoryResponse } from '@avalabs/vm-module-types';
import { getTransactionsFromGlacier } from './converters/evm-transaction-converter/get-transactions-from-glacier';
import type { EvmGlacierService } from '../../services/glacier-service/glacier-service';

export const getTransactionHistory = async ({
  chainId,
  networkToken,
  explorerUrl,
  address,
  nextPageToken,
  offset,
  glacierService,
}: {
  chainId: number;
  networkToken: NetworkToken;
  explorerUrl: string;
  address: string;
  nextPageToken?: string;
  offset?: number;
  glacierService: EvmGlacierService;
}): Promise<TransactionHistoryResponse> => {
  if (isMoralisSupportedChain(chainId)) {
    return getTransactionsFromMoralis({
      chainId,
      networkToken,
      explorerUrl,
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
