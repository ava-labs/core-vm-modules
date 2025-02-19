import type { SPLToken } from '@avalabs/vm-module-types';
import { fetchAndVerify } from '@internal/utils/src/utils/fetch-and-verify';
import { rpcErrors } from '@metamask/rpc-errors';
import { SPL_TOKENS_SCHEMA } from './spl-token-schema';

export async function getTokens({
  caip2Id,
  proxyApiUrl,
}: {
  caip2Id: string;
  proxyApiUrl: string;
}): Promise<SPLToken[]> {
  try {
    const tokens = await fetchAndVerify([`${proxyApiUrl}/solana-tokens?caip2Id=${caip2Id}`], SPL_TOKENS_SCHEMA);

    return tokens.map((token) => ({ ...token, type: token.contractType }));
  } catch (error) {
    console.error('getTokens() failed for', caip2Id, error);
    throw rpcErrors.internal(`Failed to fetch tokens for caip2Id "${caip2Id}"`);
  }
}
