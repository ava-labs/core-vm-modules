import type { GetNetworkFeeParams } from '@avalabs/vm-module-types';
import { JsonRpcBatchInternal } from '@avalabs/wallets-sdk';
import { Network } from 'ethers';

export const getProvider = ({
  glacierApiKey,
  chainId: caip2ChainId,
  chainName,
  rpcUrl,
  multiContractAddress,
}: GetNetworkFeeParams & {
  glacierApiUrl: string;
  glacierApiKey?: string;
}): JsonRpcBatchInternal => {
  if (!caip2ChainId || !chainName || !rpcUrl) {
    throw new Error('Missing required parameters');
  }

  const chainId = caip2ChainId.split(':')[1];
  if (!chainId || isNaN(Number(chainId))) {
    throw new Error('Invalid chainId');
  }

  const provider = new JsonRpcBatchInternal(
    { maxCalls: 40, multiContractAddress },
    addGlacierAPIKeyIfNeeded(rpcUrl, glacierApiKey),
    new Network(chainName, Number(chainId)),
  );

  provider.pollingInterval = 2000;

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
