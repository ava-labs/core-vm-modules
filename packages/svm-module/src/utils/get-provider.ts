import { getSolanaProvider, type SolanaProvider } from '@avalabs/core-wallets-sdk';

import { RPC_URL_DEVNET, RPC_URL_PROXY_API_ENDPOINT } from '../constants';

export const getProvider = ({
  isTestnet,
  proxyApiUrl,
}: {
  isTestnet: boolean;
  proxyApiUrl: string;
}): SolanaProvider => {
  return getSolanaProvider({
    isTestnet,
    rpcUrl: isTestnet ? RPC_URL_DEVNET : proxyApiUrl + RPC_URL_PROXY_API_ENDPOINT,
  });
};
