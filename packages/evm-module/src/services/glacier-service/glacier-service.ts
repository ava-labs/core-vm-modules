import {
  BlockchainId,
  CurrencyCode,
  Erc1155Token,
  Erc721Token,
  type GetNativeBalanceResponse,
  Glacier,
  type ListCChainAtomicBalancesResponse,
  type ListErc1155BalancesResponse,
  type ListErc20BalancesResponse,
  type ListErc721BalancesResponse,
  type ListPChainBalancesResponse,
  type ListXChainBalancesResponse,
  Network,
} from '@avalabs/glacier-sdk';

export class EvmGlacierService {
  glacierSdk: Glacier;
  isGlacierHealthy = true;
  supportedChainIds: string[] = [];

  constructor({ glacierApiUrl }: { glacierApiUrl: string }) {
    this.glacierSdk = new Glacier({ BASE: glacierApiUrl });
    /**
     * This is for performance, basically we just cache the health of glacier every 5 seconds and
     * go off of that instead of every request
     */
    this.getSupportedChainIds().catch(() => {
      // Noop. It will be retried by .isSupportedNetwork calls upon unlocking if necessary.
    });
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

  async isNetworkSupported(chainId: number): Promise<boolean> {
    const chainIds = await this.getSupportedChainIds();
    return chainIds.some((id) => id === chainId.toString());
  }

  async getSupportedChainIds(): Promise<string[]> {
    if (this.supportedChainIds.length) {
      return this.supportedChainIds;
    }

    try {
      const supportedChains = await this.glacierSdk.evmChains.supportedChains({});
      this.supportedChainIds = supportedChains.chains.map((chain) => chain.chainId);
      return this.supportedChainIds;
    } catch {
      return [];
    }
  }

  async reindexNft({
    address,
    chainId,
    tokenId,
  }: {
    address: string;
    chainId: string;
    tokenId: string;
  }): Promise<void> {
    try {
      await this.glacierSdk.nfTs.reindexNft({
        address,
        chainId,
        tokenId,
      });
    } catch (error) {
      this.setGlacierToUnhealthy();
      throw error;
    }
  }

  async getTokenDetails({
    address,
    chainId,
    tokenId,
  }: {
    address: string;
    chainId: string;
    tokenId: string;
  }): Promise<Erc721Token | Erc1155Token> {
    try {
      return this.glacierSdk.nfTs.getTokenDetails({
        address,
        chainId,
        tokenId,
      });
    } catch (error) {
      this.setGlacierToUnhealthy();
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
      this.setGlacierToUnhealthy();
      throw error;
    }
  }

  async getNativeBalance({
    chainId,
    address,
    currency,
  }: {
    chainId: string;
    address: string;
    currency: CurrencyCode;
  }): Promise<GetNativeBalanceResponse> {
    try {
      return this.glacierSdk.evmBalances.getNativeBalance({
        chainId,
        address,
        currency: currency.toLocaleLowerCase() as CurrencyCode,
      });
    } catch (error) {
      this.setGlacierToUnhealthy();
      throw error;
    }
  }

  async listErc721Balances({
    chainId,
    address,
    pageSize,
    pageToken,
  }: {
    chainId: string;
    address: string;
    pageSize: number;
    pageToken?: string;
  }): Promise<ListErc721BalancesResponse> {
    try {
      return this.glacierSdk.evmBalances.listErc721Balances({
        chainId,
        address,
        pageSize,
        pageToken,
      });
    } catch (error) {
      this.setGlacierToUnhealthy();
      throw error;
    }
  }

  async listErc1155Balances({
    chainId,
    address,
    pageSize,
    pageToken,
  }: {
    chainId: string;
    address: string;
    pageSize: number;
    pageToken?: string;
  }): Promise<ListErc1155BalancesResponse> {
    try {
      return this.glacierSdk.evmBalances.listErc1155Balances({
        chainId,
        address,
        pageSize,
        pageToken,
      });
    } catch (error) {
      this.setGlacierToUnhealthy();
      throw error;
    }
  }

  async listErc20Balances({
    chainId,
    address,
    currency,
    pageSize,
    pageToken,
  }: {
    chainId: string;
    address: string;
    currency: CurrencyCode;
    pageSize: number;
    pageToken?: string;
  }): Promise<ListErc20BalancesResponse> {
    try {
      return this.glacierSdk.evmBalances.listErc20Balances({
        chainId,
        address,
        currency: currency.toLocaleLowerCase() as CurrencyCode,
        pageSize,
        pageToken,
      });
    } catch (error) {
      this.setGlacierToUnhealthy();
      throw error;
    }
  }

  async listTransactions({
    chainId,
    address,
    pageToken,
    pageSize,
  }: {
    chainId: string;
    address: string;
    pageToken?: string;
    pageSize?: number;
  }) {
    try {
      return this.glacierSdk.evmTransactions.listTransactions({
        chainId,
        address,
        pageToken,
        pageSize,
      });
    } catch (error) {
      this.setGlacierToUnhealthy();
      throw error;
    }
  }
}
