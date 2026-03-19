/**
 * Etherscan-compatible explorer API URLs for L2 chains not supported by Glacier.
 * These explorers all support the standard Etherscan API format
 * (module=account, action=txlist/tokentx).
 */
const EXPLORER_API_URLS: Record<number, string> = {
  8453: 'https://api.basescan.org', // Base
  42161: 'https://api.arbiscan.io', // Arbitrum One
  10: 'https://api-optimistic.etherscan.io', // Optimism
};

export const getExplorerApiUrl = (chainId: number): string | undefined => {
  return EXPLORER_API_URLS[chainId];
};
