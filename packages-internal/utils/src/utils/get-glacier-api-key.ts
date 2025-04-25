import { GLACIER_API_KEY } from '../consts';

// this key is only needed in development to bypass rate limit
// it should never be used in production
export const getGlacierApiKey = (): string | undefined => {
  return GLACIER_API_KEY;
};
