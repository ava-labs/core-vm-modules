import { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';
import { addGlacierAPIKeyIfNeeded } from '@internal/utils';
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
