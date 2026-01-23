import type { SigningResult } from '@avalabs/vm-module-types';
import type { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';
import { retry, RetryBackoffPolicy } from '@internal/utils';

export const getTxHash = async (
  provider: JsonRpcBatchInternal,
  response: SigningResult,
  options?: { shouldRetry?: boolean },
) => {
  if ('txHash' in response) {
    return response.txHash;
  }

  const broadcast = () => provider.send('eth_sendRawTransaction', [response.signedData]);

  if (!options?.shouldRetry) {
    return broadcast();
  }

  return retry({
    operation: () => broadcast(),
    isSuccess: () => true,
    maxRetries: 6,
    backoffPolicy: RetryBackoffPolicy.linearThenExponential(4, 1000),
  });
};
