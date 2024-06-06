export function getExplorerAddressByNetwork(
  explorerUrl: string,
  hash: string,
  hashType: 'address' | 'tx' = 'tx',
): string {
  return `${explorerUrl}/${hashType}/${hash}`;
}
