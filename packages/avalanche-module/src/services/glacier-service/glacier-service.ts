import {
  BlockchainId,
  Glacier,
  type ListCChainAtomicBalancesResponse,
  type ListCChainAtomicTransactionsResponse,
  type ListPChainBalancesResponse,
  type ListPChainTransactionsResponse,
  type ListXChainBalancesResponse,
  type ListXChainTransactionsResponse,
  Network,
  PrimaryNetworkTxType,
  SortOrder,
} from '@avalabs/glacier-sdk';
import { getGlacierApiKey, CustomFetchHttpRequest, type CustomOpenAPIConfig } from '@internal/utils';

class GlacierUnhealthyError extends Error {
  override message = 'Glacier is unhealthy. Try again later.';
}

const customGlacierConfig: Partial<CustomOpenAPIConfig> = {
  GLOBAL_QUERY_PARAMS: {
    rltoken: getGlacierApiKey(),
  },
};

export class AvalancheGlacierService {
  glacierSdk: Glacier;
  isGlacierHealthy = true;

  constructor({ glacierApiUrl, headers }: { glacierApiUrl: string; headers?: Record<string, string> }) {
    this.glacierSdk = new Glacier(
      { BASE: glacierApiUrl, HEADERS: headers, ...customGlacierConfig },
      CustomFetchHttpRequest,
    );
  }

  isHealthy = (): boolean => this.isGlacierHealthy;

  setGlacierToUnhealthy(): void {
    this.isGlacierHealthy = false;
    setTimeout(
      () => {
        this.isGlacierHealthy = true;
      },
      5 * 60 * 1000,
    ); // 5 minutes
  }

  async listLatestPrimaryNetworkTransactions(params: {
    blockchainId: BlockchainId;
    network: Network;
    addresses?: string;
    txTypes?: Array<PrimaryNetworkTxType>;
    startTimestamp?: number;
    endTimestamp?: number;
    pageToken?: string;
    pageSize?: number;
    sortOrder?: SortOrder;
  }): Promise<ListPChainTransactionsResponse | ListXChainTransactionsResponse | ListCChainAtomicTransactionsResponse> {
    try {
      return this.glacierSdk.primaryNetworkTransactions.listLatestPrimaryNetworkTransactions(params);
    } catch (error) {
      if (error instanceof GlacierUnhealthyError) {
        this.setGlacierToUnhealthy();
      }
      throw error;
    }
  }

  async getChainBalance(params: {
    blockchainId: BlockchainId;
    network: Network;
    blockTimestamp?: number;
    addresses?: string;
  }): Promise<ListPChainBalancesResponse | ListXChainBalancesResponse | ListCChainAtomicBalancesResponse> {
    try {
      return this.glacierSdk.primaryNetworkBalances.getBalancesByAddresses(params);
    } catch (error) {
      if (error instanceof GlacierUnhealthyError) {
        this.setGlacierToUnhealthy();
      }
      throw error;
    }
  }
}
