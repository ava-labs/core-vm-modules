import type { Network } from '@avalabs/vm-module-types';

const fallbackExplorerUrl = 'https://explorer.solana.com';

export function getExplorerAddressByNetwork(network: Network, hash: string, hashType: 'address' | 'tx' = 'tx') {
  try {
    // Try to respect any query params set on {network.explorerUrl}
    const baseUrl = network.explorerUrl ? new URL(network.explorerUrl) : new URL(fallbackExplorerUrl);
    baseUrl.pathname += `${hashType}/${hash}`;
    return baseUrl.toString();
  } catch {
    return `${network.explorerUrl}/${hashType}/${hash}`;
  }
}
