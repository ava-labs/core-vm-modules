import { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';
import { FetchRequest, Network as EVMNetwork } from 'ethers';

// Network RPC URLs can be user-supplied, so auth headers (e.g. an AppCheck token)
// must only ever reach Core's own proxy.
const CORE_PROXY_HOSTS = new Set(['core-proxy-api.avax.network', 'core-proxy-api.avax-test.network']);

export type GetAuthHeaders = () => Promise<Record<string, string> | undefined>;

type ProviderParams = {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  multiContractAddress?: string;
  pollingInterval?: number;
  customRpcHeaders?: Record<string, string>;
  getAuthHeaders?: GetAuthHeaders;
};

const isCoreProxyUrl = (url: string): boolean => {
  try {
    return CORE_PROXY_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
};

export const getProvider = async (params: ProviderParams): Promise<JsonRpcBatchInternal> => {
  const {
    chainId,
    chainName,
    rpcUrl,
    multiContractAddress,
    pollingInterval = 2000,
    customRpcHeaders,
    getAuthHeaders,
  } = params;

  const resolveAuthHeaders = isCoreProxyUrl(rpcUrl) ? getAuthHeaders : undefined;
  let urlOrFetchRequest: string | FetchRequest = rpcUrl;

  if (customRpcHeaders || resolveAuthHeaders) {
    const fetchRequest = new FetchRequest(rpcUrl);

    for (const [name, value] of Object.entries(customRpcHeaders ?? {})) {
      fetchRequest.setHeader(name, value);
    }

    if (resolveAuthHeaders) {
      // Runs before every request (ethers clones the request per call and keeps
      // the preflight), so short-lived tokens are re-read each time.
      fetchRequest.preflightFunc = async (request) => {
        for (const [name, value] of Object.entries((await resolveAuthHeaders()) ?? {})) {
          request.setHeader(name, value);
        }
        return request;
      };
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
