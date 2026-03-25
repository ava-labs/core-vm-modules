const MORALIS_SUPPORTED_CHAIN_IDS = new Set([
  1, // Ethereum
  4, // Ethereum test — Rinkeby
  5, // Ethereum test — Goerli
  11155111, // Ethereum test — Sepolia
  8453, // Base
  42161, // Arbitrum One
  10, // Optimism
]);

export function isMoralisSupportedChain(chainId: number): boolean {
  return MORALIS_SUPPORTED_CHAIN_IDS.has(chainId);
}
