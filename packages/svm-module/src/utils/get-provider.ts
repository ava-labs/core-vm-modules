import { getSolanaProvider, type SolanaProvider } from '@avalabs/core-wallets-sdk';
import { addGlacierAPIKeyIfNeeded } from '@internal/utils';

import { RPC_URL_DEVNET, RPC_URL_PROXY_API_ENDPOINT } from '../constants';

export const getProvider = ({
  isTestnet,
  proxyApiUrl,
}: {
  isTestnet: boolean;
  proxyApiUrl: string;
}): SolanaProvider => {
  const rpcUrl = isTestnet ? RPC_URL_DEVNET : proxyApiUrl + RPC_URL_PROXY_API_ENDPOINT;
  const url = addGlacierAPIKeyIfNeeded(rpcUrl);
  console.log('url', url);
  return getSolanaProvider({
    isTestnet,
    rpcUrl: url,
  });
};
