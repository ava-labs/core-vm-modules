import { getGlacierApiKey } from './get-glacier-api-key';

export const getRateLimitBypassHeader = (): Record<string, string> | undefined => {
  const glacierApiKey = getGlacierApiKey();

  if (glacierApiKey) {
    return {
      rltoken: glacierApiKey,
    };
  }
};
