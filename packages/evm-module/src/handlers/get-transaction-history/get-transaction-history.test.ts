import { getTransactionHistory } from './get-transaction-history';
import { getTransactionFromEtherscan } from './converters/etherscan-transaction-converter/get-transaction-from-etherscan';
import { getTransactionsFromGlacier } from './converters/evm-transaction-converter/get-transactions-from-glacier';
import type { GlacierService } from '@internal/utils';

jest.mock('./converters/evm-transaction-converter/get-transactions-from-glacier', () => ({
  getTransactionsFromGlacier: jest.fn(),
}));

jest.mock('./converters/etherscan-transaction-converter/get-transaction-from-etherscan', () => ({
  getTransactionFromEtherscan: jest.fn(),
}));

describe('get-transaction-history', () => {
  it('should have called getTransactionFromEtherscan', async () => {
    await getTransactionHistory({
      glacierService: {} as GlacierService,
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
  it('should have called getTransactionsFromGlacier', async () => {
    await getTransactionHistory({
      glacierService: {} as GlacierService,
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
  });
});
