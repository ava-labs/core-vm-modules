import { getSolanaProvider, type SolanaProvider } from '@avalabs/core-wallets-sdk';
import { SolanaCaip2ChainId } from '@avalabs/core-chains-sdk';
import type { Network } from '@avalabs/vm-module-types';
import { addGlacierAPIKeyIfNeeded } from '@internal/utils';

import { RPC_URL_DEVNET, RPC_URL_PROXY_API_ENDPOINT, RPC_URL_TESTNET } from '../constants';

// A single `isTestnet` flag cannot distinguish Devnet from Testnet; both are
// testnets. Solana messages carry no chain id, so routing to the wrong cluster
// silently answers for a chain the user did not ask for.
const getSolanaRpcUrl = ({
  caipId,
  isTestnet,
  proxyApiUrl,
}: {
  caipId: string | undefined;
  isTestnet: boolean;
  proxyApiUrl: string;
}): string => {
  switch (caipId) {
    case SolanaCaip2ChainId.MAINNET:
      return proxyApiUrl + RPC_URL_PROXY_API_ENDPOINT;
    case SolanaCaip2ChainId.DEVNET:
      return RPC_URL_DEVNET; // NowNodes does not support Solana Devnet
    case SolanaCaip2ChainId.TESTNET:
      return RPC_URL_TESTNET;
    default:
      if (caipId) {
        throw new Error(`Unsupported Solana CAIP-2 id: ${caipId}`);
      }
      // Without a CAIP id we cannot tell Devnet from Testnet, but routing a
      // testnet network to the Mainnet proxy would answer for a cluster the
      // user did not ask for. Fall back on the coarse testnet flag instead.
      return isTestnet ? RPC_URL_DEVNET : proxyApiUrl + RPC_URL_PROXY_API_ENDPOINT;
  }
};

export const getProvider = ({ network, proxyApiUrl }: { network: Network; proxyApiUrl: string }): SolanaProvider => {
  const isTestnet = Boolean(network.isTestnet);
  const url = addGlacierAPIKeyIfNeeded(getSolanaRpcUrl({ caipId: network.caipId, isTestnet, proxyApiUrl }));

  return getSolanaProvider({
    isTestnet,
    rpcUrl: url,
  });
};
