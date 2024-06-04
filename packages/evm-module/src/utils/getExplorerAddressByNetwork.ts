import type { Network } from '@avalabs/chains-sdk';

export function getExplorerAddressByNetwork(network: Network, hash: string, hashType: 'address' | 'tx' = 'tx'): string {
  return `${network.explorerUrl}/${hashType}/${hash}`;
}
