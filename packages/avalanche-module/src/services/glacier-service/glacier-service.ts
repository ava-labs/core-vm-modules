import { ChainId } from '@avalabs/chains-sdk';
import {
  BlockchainId,
  type ListCChainAtomicTransactionsResponse,
  type ListPChainTransactionsResponse,
  type ListXChainTransactionsResponse,
  Network,
  PrimaryNetworkTxType,
  SortOrder,
} from '@avalabs/glacier-sdk';
import { GlacierService } from '@internal/utils';

export class AvalancheGlacierService extends GlacierService {
  override getSupportedChainIds(): Promise<string[]> {
    return Promise.resolve([ChainId.AVALANCHE_XP.toString(), ChainId.AVALANCHE_TEST_XP.toString()]);
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
    return this.glacierSdk.primaryNetworkTransactions.listLatestPrimaryNetworkTransactions(params);
  }
}
