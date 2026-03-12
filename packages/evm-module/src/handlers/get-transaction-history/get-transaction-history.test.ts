import { getTransactionHistory } from './get-transaction-history';
import { getTransactionFromEtherscan } from './converters/etherscan-transaction-converter/get-transaction-from-etherscan';
import { getTransactionsFromExplorerApi } from './converters/etherscan-transaction-converter/get-transactions-from-explorer-api';
import { getTransactionsFromGlacier } from './converters/evm-transaction-converter/get-transactions-from-glacier';
import type { EvmGlacierService } from '../../services/glacier-service/glacier-service';

jest.mock('./converters/evm-transaction-converter/get-transactions-from-glacier', () => ({
  getTransactionsFromGlacier: jest.fn(),
}));

jest.mock('./converters/etherscan-transaction-converter/get-transaction-from-etherscan', () => ({
  getTransactionFromEtherscan: jest.fn(),
}));

jest.mock('./converters/etherscan-transaction-converter/get-transactions-from-explorer-api', () => ({
  getTransactionsFromExplorerApi: jest.fn(),
}));

describe('get-transaction-history', () => {
  it('should have called getTransactionFromEtherscan', async () => {
    await getTransactionHistory({
      glacierService: {} as EvmGlacierService,
      chainId: 1,
      isTestnet: false,
      networkToken: {
        name: 'networkToken',
        symbol: 'networkToken',
        decimals: 1,
        description: 'description',
        logoUri: 'logoUri',
      },
      explorerUrl: 'explorerUrl',
      address: 'address',
      nextPageToken: 'nextPageToken',
      offset: 1,
    });
    expect(getTransactionFromEtherscan).toHaveBeenCalled();
  });
  it('should have called getTransactionsFromExplorerApi for Base (8453)', async () => {
    await getTransactionHistory({
      glacierService: {} as EvmGlacierService,
      chainId: 8453,
      isTestnet: false,
      networkToken: {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18,
        description: 'Ether',
        logoUri: 'logoUri',
      },
      explorerUrl: 'https://basescan.org',
      address: 'address',
      nextPageToken: 'nextPageToken',
      offset: 1,
    });
    expect(getTransactionsFromExplorerApi).toHaveBeenCalled();
    expect(getTransactionsFromGlacier).not.toHaveBeenCalled();
    expect(getTransactionFromEtherscan).not.toHaveBeenCalled();
  });

  it('should have called getTransactionsFromExplorerApi for Arbitrum (42161)', async () => {
    await getTransactionHistory({
      glacierService: {} as EvmGlacierService,
      chainId: 42161,
      isTestnet: false,
      networkToken: {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18,
        description: 'Ether',
        logoUri: 'logoUri',
      },
      explorerUrl: 'https://arbiscan.io',
      address: 'address',
    });
    expect(getTransactionsFromExplorerApi).toHaveBeenCalled();
  });

  it('should have called getTransactionsFromExplorerApi for Optimism (10)', async () => {
    await getTransactionHistory({
      glacierService: {} as EvmGlacierService,
      chainId: 10,
      isTestnet: false,
      networkToken: {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18,
        description: 'Ether',
        logoUri: 'logoUri',
      },
      explorerUrl: 'https://optimistic.etherscan.io',
      address: 'address',
    });
    expect(getTransactionsFromExplorerApi).toHaveBeenCalled();
  });

  it('should have called getTransactionsFromGlacier for non-L2 chains', async () => {
    const mockGlacierService: EvmGlacierService = {
      ...expect.any(Object),
      isHealthy: jest.fn().mockReturnValue(true),
    };
    await getTransactionHistory({
      glacierService: mockGlacierService,
      chainId: 41334,
      isTestnet: false,
      networkToken: {
        name: 'networkToken',
        symbol: 'networkToken',
        decimals: 1,
        description: 'description',
        logoUri: 'logoUri',
      },
      explorerUrl: 'explorerUrl',
      address: 'address',
      nextPageToken: 'nextPageToken',
      offset: 1,
    });
    expect(getTransactionsFromGlacier).toHaveBeenCalled();
    expect(getTransactionsFromExplorerApi).not.toHaveBeenCalled();
  });
});
