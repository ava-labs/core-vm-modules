import { getErc20Balances } from './get-erc20-balances';
import { ethers } from 'ethers';
import { TokenType } from '@avalabs/vm-module-types';

describe('get-erc20-balances', () => {
  it('should return erc20 token balances', async () => {
    jest.spyOn(ethers, 'Contract').mockImplementation(() => {
      return {
        balanceOf: jest.fn().mockResolvedValue(1000000000000000000n),
      } as never;
    });

    const balance = getErc20Balances({
      tokens: [
        {
          address: '0x123',
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18,
          logoUri: 'https://example.com/logo.png',
          type: TokenType.ERC20,
        },
      ],
      provider: {
        getBalance: jest.fn().mockResolvedValue(1000000000000000000n),
      } as never,
      tokenService: {
        getPricesByAddresses: jest.fn().mockResolvedValue({
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
            assetPlatformId: '123',
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
      '0x123': {
        address: '0x123',
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
        logoUri: 'https://example.com/logo.png',
        balance: 1000000000000000000n,
        balanceCurrencyDisplayValue: '1000.00',
        balanceDisplayValue: '1',
        balanceInCurrency: 1000,
        priceInCurrency: 1000,
        type: 'ERC20',
        change24: 0,
        marketCap: 0,
        vol24: 0,
      },
    });
  });
});
