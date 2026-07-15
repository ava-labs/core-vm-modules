import { getTransactionsFromMoralis } from './converters/moralis-transaction-converter/get-transactions-from-moralis';
import { isMoralisSupportedChain } from './utils/moralis-chain-ids';
import type { NetworkToken, TransactionHistoryResponse } from '@avalabs/vm-module-types';
import { getTransactionsFromGlacier } from './converters/evm-transaction-converter/get-transactions-from-glacier';
import type { EvmGlacierService } from '../../services/glacier-service/glacier-service';
import type { HyperEvmEtherscanClient } from '../../services/hyperevm-etherscan-client/hyperevm-etherscan-client';
import { getTransactionsFromHyperEvm } from './converters/hyperevm-transaction-converter/get-transactions-from-hyperevm';

const HYPEREVM_CHAIN_ID = 999;

export const getTransactionHistory = async ({
  chainId,
  networkToken,
  explorerUrl,
  address,
  nextPageToken,
  offset,
  glacierService,
  hyperEvmEtherscanClient,
}: {
  chainId: number;
  networkToken: NetworkToken;
  explorerUrl: string;
  address: string;
  nextPageToken?: string;
  offset?: number;
  glacierService: EvmGlacierService;
  hyperEvmEtherscanClient?: HyperEvmEtherscanClient;
}): Promise<TransactionHistoryResponse> => {
  if (chainId === HYPEREVM_CHAIN_ID) {
    if (!hyperEvmEtherscanClient) {
      return { transactions: [], nextPageToken: '' };
    }

    return getTransactionsFromHyperEvm({
      client: hyperEvmEtherscanClient,
      chainId,
      networkToken,
      explorerUrl,
      address,
      nextPageToken,
      offset,
    });
  }

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
