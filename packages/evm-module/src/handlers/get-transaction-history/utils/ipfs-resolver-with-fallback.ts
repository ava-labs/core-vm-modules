import { ipfsResolver } from '@avalabs/core-utils-sdk';

export const CLOUDFLARE_IPFS_URL = 'https://cloudflare-ipfs.com';

export function ipfsResolverWithFallback(
  sourceUrl: string | undefined,
  desiredGatewayPrefix: string = CLOUDFLARE_IPFS_URL,
) {
  if (!sourceUrl) {
    return '';
  }

  try {
    return ipfsResolver(sourceUrl, desiredGatewayPrefix);
  } catch {
    return sourceUrl;
  }
}
