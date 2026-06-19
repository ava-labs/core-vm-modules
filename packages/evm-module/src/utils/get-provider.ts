import { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';
import { getGlacierApiKey } from '@internal/utils';
import { FetchRequest, Network as EVMNetwork } from 'ethers';

type ProviderParams = {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  multiContractAddress?: string;
  pollingInterval?: number;
  customRpcHeaders?: Record<string, string>;
};

export const getProvider = async (params: ProviderParams): Promise<JsonRpcBatchInternal> => {
  const { chainId, chainName, rpcUrl, multiContractAddress, pollingInterval = 2000, customRpcHeaders } = params;

  const url = addGlacierAPIKeyIfNeeded(rpcUrl);
  let urlOrFetchRequest: string | FetchRequest = url;

  if (customRpcHeaders) {
    const fetchRequest = new FetchRequest(url);

    for (const [name, value] of Object.entries(customRpcHeaders)) {
      fetchRequest.setHeader(name, value);
    }

    urlOrFetchRequest = fetchRequest;
  }

  const provider = new JsonRpcBatchInternal(
    { maxCalls: 40, multiContractAddress },
    urlOrFetchRequest,
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
