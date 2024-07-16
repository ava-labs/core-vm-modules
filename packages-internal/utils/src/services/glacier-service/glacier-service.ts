import { Glacier } from '@avalabs/glacier-sdk';
import { ChainId } from '@avalabs/chains-sdk';

export class GlacierService {
  protected glacierSdk: Glacier;
  protected isGlacierHealthy = true;
  protected supportedChainIds: string[] = [];

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

  async isNetworkSupported(chainId: number): Promise<boolean> {
    const chainIds = await this.getSupportedChainIds();
    return chainIds.some((id) => id === chainId.toString());
  }

  setGlacierToUnhealthy(): void {
    this.isGlacierHealthy = false;
    setTimeout(
      () => {
        this.isGlacierHealthy = true;
      },
      5 * 60 * 1000,
    ); // 5 minutes
  }

  private async getSupportedChainIds(): Promise<string[]> {
    if (this.supportedChainIds.length) {
      return this.supportedChainIds;
    }

    try {
      const supportedChains = await this.glacierSdk.evmChains.supportedChains({});
      this.supportedChainIds = supportedChains.chains.map((chain) => chain.chainId);
      //even though glacier supports X and P chains the SDK doesn't provide 'em as list
      // so we push them manually
      this.supportedChainIds.push(ChainId.AVALANCHE_XP.toString());
      this.supportedChainIds.push(ChainId.AVALANCHE_TEST_XP.toString());
      return this.supportedChainIds;
    } catch {
      return [];
    }
  }
}
