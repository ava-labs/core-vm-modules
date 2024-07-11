import type { NetworkContractToken } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';

export async function getTokens({
  chainId,
  proxyApiUrl,
}: {
  chainId: number;
  proxyApiUrl: string;
}): Promise<NetworkContractToken[]> {
  const response = await fetch(`${proxyApiUrl}/tokens?evmChainId=${chainId}`);

  if (!response.ok) {
    throw rpcErrors.internal(`Failed to fetch tokens for chainId ${chainId}`);
  }

  return response.json();
}
