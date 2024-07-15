import { BN } from 'bn.js';
import { getNativeTokenBalances } from './get-native-token-balances';
import type { GlacierService } from '@internal/utils';

describe('get-native-token-balances', () => {
  it('should return native token balances', async () => {
    const mockGlacierService: GlacierService = {
      ...expect.any(Object),
      getNativeBalance: jest.fn().mockResolvedValue({
        nativeTokenBalance: {
          balance: new BN('1000000000000000000'),
          decimals: 18,
          name: 'Ethereum',
          symbol: 'ETH',
          price: {
            value: 1000,
          },
          logoUri: 'https://example.com/logo.png',
        },
      }),
    };

    const balance = getNativeTokenBalances({
      address: '0x123',
      currency: 'USD',
      chainId: 123,
      glacierService: mockGlacierService,
    });

    expect(balance).resolves.toEqual({
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
      type: 'NATIVE',
      logoUri: 'https://example.com/logo.png',
      balance: new BN('1000000000000000000'),
      balanceDisplayValue: '1',
      balanceInCurrency: 1000,
      balanceCurrencyDisplayValue: '1000.00',
      priceInCurrency: 1000,
      marketCap: 0,
      vol24: 0,
      change24: 0,
      coingeckoId: '',
    });
  });

  it('should return native token object without balance data', async () => {
    const mockGlacierService: GlacierService = {
      ...expect.any(Object),
      getNativeBalance: jest.fn().mockRejectedValue(new Error('Failed to get native balance')),
    };
    const balance = getNativeTokenBalances({
      address: '0x123',
      currency: 'USD',
      chainId: 123,
      glacierService: mockGlacierService,
    });
    expect(balance).rejects.toEqual(new Error('Failed to get native balance'));
  });
});
