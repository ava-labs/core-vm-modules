import type { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';
import type { SigningResult } from '@avalabs/vm-module-types';

import { getTxHash } from './get-tx-hash';

describe('getTxHash', () => {
  let provider: JsonRpcBatchInternal;

  beforeEach(() => {
    provider = {
      send: jest.fn(),
    } as unknown as JsonRpcBatchInternal;
  });

  it('should return txHash if present in response', async () => {
    const response: SigningResult = { txHash: '0x123' };

    const result = await getTxHash(provider, response);

    expect(result).toBe('0x123');
  });

  it('should broadcast the signed transaction if txHash is not present in response', async () => {
    const response: SigningResult = { signedData: '0x456' };
    (provider.send as jest.Mock).mockResolvedValue('0x789');

    const result = await getTxHash(provider, response);

    expect(provider.send).toHaveBeenCalledWith('eth_sendRawTransaction', ['0x456']);
    expect(result).toBe('0x789');
  });

  it('retries InvalidInputRpcError on Avalanche C-chain when retry is enabled', async () => {
    jest.useFakeTimers();

    const response: SigningResult = { signedData: '0x456' };
    const invalidInputError = Object.assign(new Error('invalid input'), { name: 'InvalidInputRpcError' });
    (provider.send as jest.Mock).mockRejectedValueOnce(invalidInputError).mockResolvedValueOnce('0x789');

    const resultPromise = getTxHash(provider, response, { chainId: 43114, shouldRetry: true });

    await jest.runOnlyPendingTimersAsync();
    const result = await resultPromise;

    expect(provider.send).toHaveBeenCalledTimes(2);
    expect(result).toBe('0x789');

    jest.useRealTimers();
  });

  it('stops after 3 InvalidInputRpcError retries on Avalanche C-chain when retry is enabled', async () => {
    jest.useFakeTimers();

    const response: SigningResult = { signedData: '0x456' };
    const invalidInputError = Object.assign(new Error('still invalid'), { name: 'InvalidInputRpcError' });
    (provider.send as jest.Mock).mockRejectedValue(invalidInputError);

    const resultPromise = getTxHash(provider, response, { chainId: 43113, shouldRetry: true });
    // prevent unhandled rejection noise while timers advance
    resultPromise.catch(() => undefined);

    await jest.runAllTimersAsync();

    await expect(resultPromise).rejects.toThrow('still invalid');
    expect(provider.send).toHaveBeenCalledTimes(3);

    jest.useRealTimers();
  });

  it('does not retry InvalidInputRpcError outside Avalanche C-chain', async () => {
    const response: SigningResult = { signedData: '0x456' };
    const invalidInputError = Object.assign(new Error('invalid input'), { name: 'InvalidInputRpcError' });
    (provider.send as jest.Mock).mockRejectedValue(invalidInputError);

    await expect(getTxHash(provider, response, { chainId: 1 })).rejects.toThrow('invalid input');
    expect(provider.send).toHaveBeenCalledTimes(1);
  });

  it('does not retry on Avalanche C-chain when retry is disabled', async () => {
    const response: SigningResult = { signedData: '0x456' };
    const invalidInputError = Object.assign(new Error('invalid input'), { name: 'InvalidInputRpcError' });
    (provider.send as jest.Mock).mockRejectedValue(invalidInputError);

    await expect(getTxHash(provider, response, { chainId: 43114, shouldRetry: false })).rejects.toThrow(
      'invalid input',
    );
    expect(provider.send).toHaveBeenCalledTimes(1);
  });
});
