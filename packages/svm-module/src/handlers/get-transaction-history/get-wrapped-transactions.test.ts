import type { Network } from '@avalabs/vm-module-types';
import { NetworkVMType } from '@avalabs/vm-module-types';

import { getProvider } from '@src/utils/get-provider';

import { getWrappedTransactions } from './get-wrapped-transactions';

jest.mock('@src/utils/get-provider');

describe('src/handlers/get-transaction-history/get-wrapped-transactions', () => {
  const mockProvider = {
    getSignaturesForAddress: jest.fn(),
    getTransaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getProvider as jest.Mock).mockReturnValue(mockProvider);
  });

  const address = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijk';

  const mockNetwork: Network = {
    chainId: 101,
    chainName: 'Solana Mainnet',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    networkToken: {
      name: 'Solana',
      symbol: 'SOL',
      decimals: 9,
    },
    vmName: NetworkVMType.SVM,
    isTestnet: false,
  };

  const mockTestnetNetwork: Network = {
    ...mockNetwork,
    chainId: 103,
    chainName: 'Solana Devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    isTestnet: true,
  };

  it('should return wrapped transactions', async () => {
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

    const result = await getWrappedTransactions({ network: mockNetwork, address, proxyApiUrl });

    expect(getProvider).toHaveBeenCalledWith({ isTestnet: false, proxyApiUrl });
    expect(mockProvider.getSignaturesForAddress).toHaveBeenCalledWith(expect.anything(), { limit: 25 });
    expect(mockProvider.getTransaction).toHaveBeenCalledWith('sig1', {
      encoding: 'json',
      maxSupportedTransactionVersion: 0,
    });
    expect(mockProvider.getTransaction).toHaveBeenCalledWith('sig2', {
      encoding: 'json',
      maxSupportedTransactionVersion: 0,
    });
    expect(result).toEqual([
      { txHash: 'sig1', tx: transactionResponse1 },
      { txHash: 'sig2', tx: transactionResponse2 },
    ]);
  });

  it('should handle empty signatures response', async () => {
    const proxyApiUrl = 'test-proxyApiUrl';

    mockProvider.getSignaturesForAddress.mockReturnValue({
      send: jest.fn().mockResolvedValue([]),
    });

    const result = await getWrappedTransactions({ network: mockTestnetNetwork, address, proxyApiUrl });

    expect(result).toEqual([]);
  });

  it('should handle rejected transactions', async () => {
    const proxyApiUrl = 'test-proxyApiUrl';

    const signaturesResponse = [{ signature: 'sig1' }, { signature: 'sig2' }];
    const transactionResponse1 = { tx: 'transaction1' };

    mockProvider.getSignaturesForAddress.mockReturnValue({
      send: jest.fn().mockResolvedValue(signaturesResponse),
    });
    mockProvider.getTransaction.mockImplementation((sig) => ({
      send: jest.fn().mockResolvedValue(sig === 'sig1' ? transactionResponse1 : Promise.reject('error')),
    }));

    const result = await getWrappedTransactions({ network: mockNetwork, address, proxyApiUrl });

    expect(result).toEqual([{ txHash: 'sig1', tx: transactionResponse1 }]);
  });
});
