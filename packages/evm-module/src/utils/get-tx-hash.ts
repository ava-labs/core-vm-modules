import type { SigningResult } from '@avalabs/vm-module-types';
import type { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';

const isInvalidInputRpcError = (error: unknown) => {
  return typeof error === 'object' && error !== null && (error as { name?: string }).name === 'InvalidInputRpcError';
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await broadcast();
    } catch (error) {
      if (!isInvalidInputRpcError(error) || attempt === 2) {
        throw error;
      }

      lastError = error;
      await wait(1000);
    }
  }

  throw lastError ?? new Error('Unable to broadcast transaction');
};
