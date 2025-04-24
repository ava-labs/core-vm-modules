import { IS_DEV, GLACIER_API_KEY } from '../consts';

// this key is only needed in development to bypass rate limit
// it should never be used in production
export const getGlacierApiKey = (): string | undefined => {
  if (IS_DEV && GLACIER_API_KEY) {
    return GLACIER_API_KEY;
  }

  return undefined;
};
