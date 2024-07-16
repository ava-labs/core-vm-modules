import {
  BlockchainId,
  Glacier,
  type ListCChainAtomicTransactionsResponse,
  type ListPChainTransactionsResponse,
  type ListXChainTransactionsResponse,
  Network,
  PrimaryNetworkTxType,
  SortOrder,
} from '@avalabs/glacier-sdk';

export class AvalancheGlacierService {
  glacierSdk: Glacier;
  isGlacierHealthy = true;

  constructor({ glacierApiUrl }: { glacierApiUrl: string }) {
    this.glacierSdk = new Glacier({ BASE: glacierApiUrl });
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
      this.setGlacierToUnhealthy();
      throw error;
    }
  }
}
