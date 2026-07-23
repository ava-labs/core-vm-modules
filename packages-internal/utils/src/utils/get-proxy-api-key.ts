import { PROXY_API_KEY } from '../consts';

// this key is only needed in development to bypass rate limit
// it should never be used in production
export const getProxyApiKey = (): string | undefined => {
  return PROXY_API_KEY;
};
