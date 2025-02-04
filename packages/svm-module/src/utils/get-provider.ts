import type { Network } from '@avalabs/vm-module-types';
import { createSolanaRpc } from '@solana/rpc';
import type { ClusterUrl } from '@solana/rpc-types';

export const getProvider = (network: Network) => {
  // eslint-disable-next-line no-console
  const scope = network.chainId;
  const clusterUrl = getClusterUrl(scope);
  const provider = createSolanaRpc(clusterUrl);
  return provider;
};

//TODO: create these chainIds as a config in the extension and chain-sdk
/*
  chainIds: 
  4503599627370463 main
  4503599627370462 dev
  4503599627370461 test
*/
// use these caipIds
const solanaMainnet = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const solanaDevnet = 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1';
const solanaTestnet = 'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z';

// TODO: this is the default mainnet url but we will use nownodes via the proxy api instead so it can be removed
// const mainnetUrl = 'https://api.mainnet-beta.solana.com';
const devnetUrl = 'https://api.devnet.solana.com';
const testnetUrl = 'https://api.testnet.solana.com';
const proxyApiUrl = '/proxy/nownodes/sol';

export const getClusterUrl = (scopeOrChainId: string | number): ClusterUrl => {
  if (scopeOrChainId === solanaMainnet || scopeOrChainId === 4503599627370463) {
    return proxyApiUrl;
  }
  if (scopeOrChainId === solanaDevnet || scopeOrChainId === 4503599627370462) {
    return devnetUrl;
  }
  if (scopeOrChainId === solanaTestnet || scopeOrChainId === 4503599627370461) {
    return testnetUrl;
  }
  throw new Error('Scope or ChainId is incorrect');
};
