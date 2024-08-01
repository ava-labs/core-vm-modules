import { ipfsResolver } from '@avalabs/utils-sdk';

export const CLOUDFLARE_IPFS_URL = 'https://ipfs.io';

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
