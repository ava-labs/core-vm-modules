import type { SigningResult } from '@avalabs/vm-module-types';
import type { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';

const AVALANCHE_C_CHAIN_IDS = new Set([43114, 43113]);
const isAvalancheCChain = (chainId?: number | string) => {
  const numericChainId = Number(chainId);
  return Number.isFinite(numericChainId) && AVALANCHE_C_CHAIN_IDS.has(numericChainId);
};

const isInvalidInputRpcError = (error: unknown) => {
  return typeof error === 'object' && error !== null && (error as { name?: string }).name === 'InvalidInputRpcError';
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getTxHash = async (
  provider: JsonRpcBatchInternal,
  response: SigningResult,
  options?: { chainId?: number | string; shouldRetry?: boolean },
) => {
  if ('txHash' in response) {
    return response.txHash;
  }

  const broadcast = () => provider.send('eth_sendRawTransaction', [response.signedData]);

  const retryEnabled = options?.shouldRetry && isAvalancheCChain(options?.chainId);

  if (!retryEnabled) {
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
