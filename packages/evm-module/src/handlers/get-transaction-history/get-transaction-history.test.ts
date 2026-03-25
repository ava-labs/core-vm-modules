import { getTransactionHistory } from './get-transaction-history';
import { getTransactionsFromMoralis } from './converters/moralis-transaction-converter/get-transactions-from-moralis';
import { getTransactionsFromGlacier } from './converters/evm-transaction-converter/get-transactions-from-glacier';
import type { EvmGlacierService } from '../../services/glacier-service/glacier-service';

jest.mock('./converters/evm-transaction-converter/get-transactions-from-glacier', () => ({
  getTransactionsFromGlacier: jest.fn(),
}));

jest.mock('./converters/moralis-transaction-converter/get-transactions-from-moralis', () => ({
  getTransactionsFromMoralis: jest.fn(),
}));

describe('get-transaction-history', () => {
  beforeEach(() => {
    jest.mocked(getTransactionsFromMoralis).mockResolvedValue({ transactions: [], nextPageToken: '' });
    jest.mocked(getTransactionsFromGlacier).mockResolvedValue({ transactions: [], nextPageToken: '' });
  });

  it('should have called getTransactionsFromMoralis for Ethereum mainnet (1)', async () => {
    await getTransactionHistory({
      glacierService: {} as EvmGlacierService,
      chainId: 1,
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
    expect(getTransactionsFromMoralis).toHaveBeenCalled();
  });

  it.each([
    { chainId: 11155111, explorerUrl: 'https://sepolia.etherscan.io' },
    { chainId: 5, explorerUrl: 'https://goerli.etherscan.io' },
    { chainId: 4, explorerUrl: 'https://rinkeby.etherscan.io' },
  ])(
    'should have called getTransactionsFromMoralis for Ethereum testnet (chainId $chainId)',
    async ({ chainId, explorerUrl }) => {
      await getTransactionHistory({
        glacierService: {} as EvmGlacierService,
        chainId,
        networkToken: {
          name: 'ETH',
          symbol: 'ETH',
          decimals: 18,
          description: 'description',
          logoUri: 'logoUri',
        },
        explorerUrl,
        address: 'address',
        nextPageToken: 'nextPageToken',
        offset: 1,
      });
      expect(getTransactionsFromMoralis).toHaveBeenCalled();
    },
  );

  it('should have called getTransactionsFromMoralis for Base (8453)', async () => {
    await getTransactionHistory({
      glacierService: {} as EvmGlacierService,
      chainId: 8453,
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
    expect(getTransactionsFromMoralis).toHaveBeenCalled();
    expect(getTransactionsFromGlacier).not.toHaveBeenCalled();
  });

  it('should have called getTransactionsFromMoralis for Arbitrum (42161)', async () => {
    await getTransactionHistory({
      glacierService: {} as EvmGlacierService,
      chainId: 42161,
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
    expect(getTransactionsFromMoralis).toHaveBeenCalled();
  });

  it('should have called getTransactionsFromMoralis for Optimism (10)', async () => {
    await getTransactionHistory({
      glacierService: {} as EvmGlacierService,
      chainId: 10,
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
    expect(getTransactionsFromMoralis).toHaveBeenCalled();
  });

  it('should have called getTransactionsFromGlacier for non-L2 chains', async () => {
    const mockGlacierService: EvmGlacierService = {
      ...expect.any(Object),
      isHealthy: jest.fn().mockReturnValue(true),
    };
    await getTransactionHistory({
      glacierService: mockGlacierService,
      chainId: 41334,
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
    expect(getTransactionsFromMoralis).not.toHaveBeenCalled();
  });
});
