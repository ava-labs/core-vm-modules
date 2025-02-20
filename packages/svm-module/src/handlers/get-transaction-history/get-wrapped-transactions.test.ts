import { address } from '@solana/addresses';

import { getProvider } from '@src/utils/get-provider';

import { getWrappedTransactions } from './get-wrapped-transactions';

jest.mock('@solana/addresses');
jest.mock('@src/utils/get-provider');

describe('src/handlers/get-transaction-history/get-wrapped-transactions', () => {
  const mockProvider = {
    getSignaturesForAddress: jest.fn(),
    getTransaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getProvider as jest.Mock).mockReturnValue(mockProvider);
    (address as jest.Mock).mockImplementation((addr) => addr);
  });

  it('should return wrapped transactions', async () => {
    const caipId = 'test-caipId';
    const address = 'test-address';
    const proxyApiUrl = 'test-proxyApiUrl';

    const signaturesResponse = [{ signature: 'sig1' }, { signature: 'sig2' }];
    const transactionResponse1 = { tx: 'transaction1' };
    const transactionResponse2 = { tx: 'transaction2' };

    mockProvider.getSignaturesForAddress.mockReturnValue({
      send: jest.fn().mockResolvedValue(signaturesResponse),
    });
    mockProvider.getTransaction.mockImplementation((sig) => ({
      send: jest.fn().mockResolvedValue(sig === 'sig1' ? transactionResponse1 : transactionResponse2),
    }));

    const result = await getWrappedTransactions({ caipId, address, proxyApiUrl });

    expect(getProvider).toHaveBeenCalledWith({ caipId, proxyApiUrl });
    expect(mockProvider.getSignaturesForAddress).toHaveBeenCalledWith(expect.anything(), { limit: 25 });
    expect(mockProvider.getTransaction).toHaveBeenCalledWith('sig1', { encoding: 'json' });
    expect(mockProvider.getTransaction).toHaveBeenCalledWith('sig2', { encoding: 'json' });
    expect(result).toEqual([
      { txHash: 'sig1', tx: transactionResponse1 },
      { txHash: 'sig2', tx: transactionResponse2 },
    ]);
  });

  it('should handle empty signatures response', async () => {
    const caipId = 'test-caipId';
    const address = 'test-address';
    const proxyApiUrl = 'test-proxyApiUrl';

    mockProvider.getSignaturesForAddress.mockReturnValue({
      send: jest.fn().mockResolvedValue([]),
    });

    const result = await getWrappedTransactions({ caipId, address, proxyApiUrl });

    expect(result).toEqual([]);
  });

  it('should handle rejected transactions', async () => {
    const caipId = 'test-caipId';
    const address = 'test-address';
    const proxyApiUrl = 'test-proxyApiUrl';

    const signaturesResponse = [{ signature: 'sig1' }, { signature: 'sig2' }];
    const transactionResponse1 = { tx: 'transaction1' };

    mockProvider.getSignaturesForAddress.mockReturnValue({
      send: jest.fn().mockResolvedValue(signaturesResponse),
    });
    mockProvider.getTransaction.mockImplementation((sig) => ({
      send: jest.fn().mockResolvedValue(sig === 'sig1' ? transactionResponse1 : Promise.reject('error')),
    }));

    const result = await getWrappedTransactions({ caipId, address, proxyApiUrl });

    expect(result).toEqual([{ txHash: 'sig1', tx: transactionResponse1 }]);
  });
});
