import type { Network } from '@avalabs/chains-sdk';

export const getNetworks = async ({ proxyApiUrl }: { proxyApiUrl: string }): Promise<Network[]> => {
  const response = await fetch(`${proxyApiUrl}/networks`);
  if (!response.ok) {
    return [];
  }
  return response.json();
};
