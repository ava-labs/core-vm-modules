export const getExplorerLink = (txHash: string, baseUrl?: string) => {
  const explorerLink = baseUrl ? new URL(baseUrl) : null;

  // Keep the query params in-tact: the Solana explorers like SolScan.io or explorer.solana.com
  // switch between clusters based on the `cluster` query param, not the domain.
  if (explorerLink) {
    explorerLink.pathname = `/tx/${txHash}`;
  }

  return explorerLink?.toString() ?? '';
};
