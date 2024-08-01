import { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';
import { Network as EVMNetwork } from 'ethers';

// this key is only needed in development to bypass rate limit
// it should never be used in production
const GLACIER_API_KEY = process.env.GLACIER_API_KEY;

type ProviderParams = {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  multiContractAddress?: string;
  pollingInterval?: number;
};

export const getProvider = (params: ProviderParams): JsonRpcBatchInternal => {
  const { chainId, chainName, rpcUrl, multiContractAddress, pollingInterval = 2000 } = params;

  const provider = new JsonRpcBatchInternal(
    { maxCalls: 40, multiContractAddress },
    addGlacierAPIKeyIfNeeded(rpcUrl, GLACIER_API_KEY),
    new EVMNetwork(chainName, chainId),
  );

  provider.pollingInterval = pollingInterval;

  return provider;
};

// RPC urls returned in the token list are always using the production URL
const knownHosts = ['glacier-api.avax.network', 'proxy-api.avax.network'];

/**
 * Glacier needs an API key for development, this adds the key if needed.
 */
export function addGlacierAPIKeyIfNeeded(url: string, glacierApiKey?: string): string {
  const urlObj = new URL(url);

  if (glacierApiKey && knownHosts.includes(urlObj.hostname)) {
    const search_params = urlObj.searchParams; // copy, does not update the URL
    search_params.set('token', glacierApiKey);
    urlObj.search = search_params.toString();
    return urlObj.toString();
  }
  return url;
}
