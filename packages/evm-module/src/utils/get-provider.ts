import { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';
import { getGlacierApiKey } from '@internal/utils';
import { Network as EVMNetwork } from 'ethers';

type ProviderParams = {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  multiContractAddress?: string;
  pollingInterval?: number;
};

export const getProvider = async (params: ProviderParams): Promise<JsonRpcBatchInternal> => {
  const { chainId, chainName, rpcUrl, multiContractAddress, pollingInterval = 2000 } = params;

  const provider = new JsonRpcBatchInternal(
    { maxCalls: 40, multiContractAddress },
    addGlacierAPIKeyIfNeeded(rpcUrl),
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
export function addGlacierAPIKeyIfNeeded(url: string): string {
  const urlObj = new URL(url);
  const glacierApiKey = getGlacierApiKey();

  if (glacierApiKey && knownHosts.includes(urlObj.hostname)) {
    const search_params = urlObj.searchParams; // copy, does not update the URL
    search_params.set('token', glacierApiKey);
    urlObj.search = search_params.toString();
    return urlObj.toString();
  }
  return url;
}
