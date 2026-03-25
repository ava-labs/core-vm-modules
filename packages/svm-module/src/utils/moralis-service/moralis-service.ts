import { fetchAndVerify } from '@internal/utils/src/utils/fetch-and-verify';

import type { SolanaNetworkName } from '@src/types';

import { PORTFOLIO_SCHEMA, type PortfolioResponse } from './moralis-schemas';

type FetchFn = typeof globalThis.fetch;
type ConstructorParams = {
  proxyApiUrl: string;
  fetch?: FetchFn;
};
export class MoralisService {
  #baseUrl: string;
  #fetchFn?: FetchFn;

  constructor(params: ConstructorParams) {
    this.#baseUrl = `${params.proxyApiUrl}/proxy/moralis`;
    this.#fetchFn = params.fetch ?? globalThis.fetch;
  }

  async getPortfolio({
    address,
    network,
  }: {
    network: SolanaNetworkName;
    address: string;
  }): Promise<{ address: string; portfolio: PortfolioResponse } | { address: string; error: string }> {
    try {
      const url = this.#buildUrl(`/account/${network}/${address}/portfolio`);
      const portfolio = await fetchAndVerify([url], PORTFOLIO_SCHEMA, this.#fetchFn);

      return {
        address,
        portfolio,
      };
    } catch (error) {
      console.error('getPortfolio() failed:', error);

      const message = error instanceof Error ? error.message : 'unknown error';

      return {
        address,
        error: `getPortfolio() failed: ${message}`,
      };
    }
  }

  #buildUrl(path: string) {
    return `${this.#baseUrl}${path}`;
  }
}
