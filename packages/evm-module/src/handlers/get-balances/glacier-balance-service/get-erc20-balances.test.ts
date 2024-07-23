import { BN } from 'bn.js';
import { getErc20Balances } from './get-erc20-balances';
import type { EvmGlacierService } from '../../../services/glacier-service/glacier-service';

describe('get-erc20-balances', () => {
  it('should return erc20 token balances', async () => {
    const mockGlacierService: EvmGlacierService = {
      ...expect.any(Object),
      listErc20Balances: jest.fn().mockResolvedValue({
        erc20TokenBalances: [
          {
            address: '0x123',
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
            logoUri: 'https://example.com/logo.png',
            ercType: 'ERC20',
            price: {
              currency: 'USD',
              value: 1000,
            },
            chainId: '123',
            balance: '1000000000000000000',
            balanceValue: {
              currency: 'USD',
              value: 1000,
            },
          },
        ],
      }),
    };
    const balance = getErc20Balances({
      glacierService: mockGlacierService,
      currency: 'USD',
      chainId: 123,
      address: '0x123',
      customTokens: [],
    });

    expect(balance).resolves.toEqual({
      '0x123': {
        chainId: 123,
        address: '0x123',
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
        logoUri: 'https://example.com/logo.png',
        balance: new BN('1000000000000000000'),
        balanceCurrencyDisplayValue: '1000',
        balanceDisplayValue: '1',
        balanceInCurrency: 1000,
        priceInCurrency: 1000,
        type: 'ERC20',
      },
    });
  });

  it('should return native token object without balance data', async () => {
    const mockGlacierService: EvmGlacierService = {
      ...expect.any(Object),
      listErc20Balances: jest.fn().mockRejectedValue(new Error('Failed to get erc20 balance')),
    };
    const balance = getErc20Balances({
      glacierService: mockGlacierService,
      currency: 'USD',
      chainId: 123,
      address: '0x123',
      customTokens: [],
    });
    expect(balance).rejects.toEqual(new Error('Failed to get erc20 balance'));
  });
});
