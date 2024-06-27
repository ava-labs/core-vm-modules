import type { Error } from '../../../token-service/coingecko-types';
import { RetryBackoffPolicy, retry } from '../../../utils/retry';

export const coingeckoRetry = <T>(
  operation: (useCoingeckoProxy: boolean) => Promise<T | Error>,
): Promise<T | undefined> => {
  return retry({
    operation: (retryIndex: number) => operation(retryIndex > 0),
    maxRetries: 2,
    backoffPolicy: RetryBackoffPolicy.constant(1),
    isSuccess: (response: T | Error) => {
      const errorStatus = (response as Error)?.status;
      return errorStatus?.error_code !== 429;
    },
  }) as Promise<T | undefined>;
};
