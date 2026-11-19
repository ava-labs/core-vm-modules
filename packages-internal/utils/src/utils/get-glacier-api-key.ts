import { GLACIER_API_KEY } from '../consts';

let runtimeGetter: (() => string | undefined) | undefined;

// Module-level because the key is read deep inside shared helpers (providers,
// the Glacier HTTP client) that have no access to a module's runtime params.
export const setGlacierApiKeyGetter = (getter: () => string | undefined): void => {
  runtimeGetter = getter;
};

// this key is only needed in development to bypass rate limit
// it should never be used in production
export const getGlacierApiKey = (): string | undefined => {
  return runtimeGetter?.() || GLACIER_API_KEY;
};
