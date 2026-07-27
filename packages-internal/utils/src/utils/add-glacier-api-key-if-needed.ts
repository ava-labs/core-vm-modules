import { getGlacierApiKey } from './get-glacier-api-key';

// RPC urls returned in the token list are always using the production URL
const knownHosts = [
  'glacier-api.avax.network',
  'proxy-api.avax.network',
  'proxy-api-dev.avax.network',
  'core-proxy-api.avax.network',
  'core-proxy-api.avax-test.network',
];

/**
 * Glacier needs an API key for development, this adds the key if needed.
 */
export function addGlacierAPIKeyIfNeeded(url: string): string {
  const urlObj = new URL(url);
  const glacierApiKey = getGlacierApiKey();

  if (glacierApiKey && knownHosts.includes(urlObj.hostname)) {
    const search_params = urlObj.searchParams; // copy, does not update the URL
    search_params.set('token', glacierApiKey);
    urlObj.search = search_params.toString();
    return urlObj.toString();
  }
  return url;
}
