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
});
