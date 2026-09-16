import { getSolanaProvider, type SolanaProvider } from '@avalabs/core-wallets-sdk';
import { SolanaCaip2ChainId } from '@avalabs/core-chains-sdk';
import type { Network } from '@avalabs/vm-module-types';
import { addGlacierAPIKeyIfNeeded } from '@internal/utils';

import { RPC_URL_DEVNET, RPC_URL_PROXY_API_ENDPOINT, RPC_URL_TESTNET } from '../constants';

// Solana has three clusters, so a single `isTestnet` flag cannot pick the right
// RPC - it routed both Devnet and Testnet to the Devnet endpoint. Solana
// messages carry no chain id, so talking to the wrong cluster silently answers
// for a chain the user did not ask for. Route on the caip id instead.
const getSolanaRpcUrl = (caipId: string | undefined, proxyApiUrl: string): string => {
  switch (caipId) {
    case SolanaCaip2ChainId.DEVNET:
      return RPC_URL_DEVNET; // NowNodes does not support Solana Devnet
    case SolanaCaip2ChainId.TESTNET:
      return RPC_URL_TESTNET;
    default:
      return proxyApiUrl + RPC_URL_PROXY_API_ENDPOINT;
  }
};

export const getProvider = ({ network, proxyApiUrl }: { network: Network; proxyApiUrl: string }): SolanaProvider => {
  const url = addGlacierAPIKeyIfNeeded(getSolanaRpcUrl(network.caipId, proxyApiUrl));

  return getSolanaProvider({
    isTestnet: Boolean(network.isTestnet),
    rpcUrl: url,
  });
};
