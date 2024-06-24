import type { NetworkContractToken, GetTokens } from '@avalabs/vm-module-types';
import { PROXY_API_URL, PROXY_API_URL_DEV } from '../../constants';

export async function getTokens({ chainId, isProd = true }: GetTokens): Promise<NetworkContractToken[]> {
  const baseUrl = isProd ? PROXY_API_URL : PROXY_API_URL_DEV;
  const response = await fetch(`${baseUrl}/tokens?evmChainId=${chainId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch tokens for chainId ${chainId}`);
  }

  return await response.json();
}
