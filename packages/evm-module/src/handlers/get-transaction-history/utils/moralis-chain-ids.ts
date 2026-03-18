const MORALIS_SUPPORTED_CHAIN_IDS = new Set([
  8453, // Base
  42161, // Arbitrum One
  10, // Optimism
]);

export function isMoralisSupportedChain(chainId: number): boolean {
  return MORALIS_SUPPORTED_CHAIN_IDS.has(chainId);
}
