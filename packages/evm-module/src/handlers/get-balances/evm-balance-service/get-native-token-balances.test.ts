import { BN } from 'bn.js';
import { getNativeTokenBalances } from './get-native-token-balances';

describe('get-native-token-balances', () => {
  it('should return native token balances', async () => {
    const balance = getNativeTokenBalances({
      provider: {
        getBalance: jest.fn().mockResolvedValue(new BN('1000000000000000000')),
      } as never,
      tokenService: {
        getSimplePrice: jest.fn().mockResolvedValue({
          '123': {
            USD: {
              price: 1000,
              marketCap: 0,
              vol24: 0,
              change24: 0,
            },
          },
        }),
      } as never,
      address: '0x123',
      currency: 'USD',
      network: {
        pricingProviders: {
          coingecko: {
            nativeTokenId: '123',
          },
        },
        networkToken: {
          address: '0x123',
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18,
          logoUri: 'https://example.com/logo.png',
        },
      } as never,
    });

    expect(balance).resolves.toEqual({
      address: '0x123',
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
      logoUri: 'https://example.com/logo.png',
      balance: new BN('1000000000000000000'),
      balanceCurrencyDisplayValue: '1000.00',
      balanceDisplayValue: '1',
      balanceInCurrency: 1000,
      priceInCurrency: 1000,
      coingeckoId: '123',
      type: 'NATIVE',
      marketCap: 0,
      vol24: 0,
      change24: 0,
    });
  });

  it('should return native token object without balance data', async () => {
    const balance = getNativeTokenBalances({
      provider: {
        getBalance: jest.fn().mockResolvedValue(new BN('0')),
      } as never,
      tokenService: {
        getSimplePrice: jest.fn().mockResolvedValue({}),
      } as never,
      address: '0x123',
      currency: 'USD',
      network: {
        pricingProviders: {
          coingecko: {
            nativeTokenId: '123',
          },
        },
        networkToken: {
          address: '0x123',
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18,
          logoUri: 'https://example.com/logo.png',
        },
      } as never,
    });
    expect(balance).resolves.toEqual({
      address: '0x123',
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
      logoUri: 'https://example.com/logo.png',
      balance: new BN('0'),
      balanceCurrencyDisplayValue: undefined,
      balanceDisplayValue: '0',
      coingeckoId: '123',
      type: 'NATIVE',
    });
  });
});
