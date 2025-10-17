import { TokenType, type Network } from '@avalabs/vm-module-types';

import { MoralisService } from '@src/utils/moralis-service';
import { getNetworkName } from '@src/utils/get-network-name';
import { SOL_DECIMALS } from '@src/constants';

import { getBalances } from './get-balances';
import type { TokenService } from '@internal/utils';

jest.mock('@src/utils/moralis-service');
jest.mock('@src/utils/get-network-name');

describe('src/handlers/get-balances', () => {
  const mockMoralisService = {
    getPortfolio: jest.fn(),
  };
  const mockTokenService = {
    getPricesByAddresses: jest.fn(),
    getWatchlistDataForToken: jest.fn(),
  } as unknown as jest.Mocked<TokenService>;
  const network = {
    pricingProviders: {
      coingecko: {
        nativeTokenId: 'solana',
        assetPlatformId: 'solana',
      },
    },
    networkToken: {
      name: 'Solana',
      symbol: 'SOL',
      decimals: SOL_DECIMALS,
      logoUri: 'https://logo.url',
    },
  } as unknown as Network;

  beforeEach(() => {
    jest.clearAllMocks();
    (MoralisService as jest.Mock).mockImplementation(() => mockMoralisService);
  });

  it('should return balances for given addresses', async () => {
    const addresses = ['address1', 'address2'];
    const proxyApiUrl = 'https://proxy.api.url';
    const currency = 'USD';

    const portfolioResults = [
      {
        address: 'address1',
        portfolio: {
          nativeBalance: { lamports: '1000000000' },
          tokens: [
            { amountRaw: '500000000', symbol: 'TOKEN1', decimals: 6, mint: 'mint1', name: 'Token 1', logo: 'logo1' },
          ],
        },
      },
      {
        address: 'address2',
        portfolio: {
          nativeBalance: { lamports: '2000000000' },
          tokens: [
            { amountRaw: '1000000000', symbol: 'TOKEN2', decimals: 6, mint: 'mint2', name: 'Token 2', logo: 'logo2' },
          ],
        },
      },
    ];

    mockMoralisService.getPortfolio.mockResolvedValueOnce(portfolioResults[0]);
    mockMoralisService.getPortfolio.mockResolvedValueOnce(portfolioResults[1]);
    mockTokenService.getWatchlistDataForToken.mockResolvedValue({
      priceInCurrency: 100,
      marketCap: 1000000,
      vol24: 10000,
      change24: 1,
    });
    mockTokenService.getPricesByAddresses.mockResolvedValue({
      mint1: { usd: { price: 1, marketCap: 100000, vol24: 1000, change24: 0.5 } },
      mint2: { usd: { price: 2, marketCap: 200000, vol24: 2000, change24: 1 } },
    });

    (getNetworkName as jest.Mock).mockReturnValue('solana');

    const result = await getBalances({
      addresses,
      proxyApiUrl,
      currency,
      network,
      tokenService: mockTokenService,
    });

    expect(result).toEqual({
      address1: {
        SOL: {
          type: TokenType.NATIVE,
          name: 'Solana',
          symbol: 'SOL',
          decimals: SOL_DECIMALS,
          balance: 1000000000n,
          balanceDisplayValue: '1',
          balanceInCurrency: 100,
          balanceCurrencyDisplayValue: '100.00',
          logoUri: 'https://logo.url',
          coingeckoId: 'solana',
          priceInCurrency: 100,
          marketCap: 1000000,
          vol24: 10000,
          change24: 1,
        },
        mint1: {
          type: TokenType.SPL,
          address: 'mint1',
          name: 'Token 1',
          symbol: 'TOKEN1',
          decimals: 6,
          balance: 500000000n,
          balanceDisplayValue: '500',
          balanceInCurrency: 500,
          balanceCurrencyDisplayValue: '500.00',
          logoUri: 'logo1',
          reputation: null,
          priceInCurrency: 1,
          marketCap: 100000,
          vol24: 1000,
          change24: 0.5,
        },
      },
      address2: {
        SOL: {
          type: TokenType.NATIVE,
          name: 'Solana',
          symbol: 'SOL',
          decimals: SOL_DECIMALS,
          balance: 2000000000n,
          balanceDisplayValue: '2',
          balanceInCurrency: 200,
          balanceCurrencyDisplayValue: '200.00',
          logoUri: 'https://logo.url',
          coingeckoId: 'solana',
          priceInCurrency: 100,
          marketCap: 1000000,
          vol24: 10000,
          change24: 1,
        },
        mint2: {
          type: TokenType.SPL,
          address: 'mint2',
          name: 'Token 2',
          symbol: 'TOKEN2',
          decimals: 6,
          balance: 1000000000n,
          balanceDisplayValue: '1000',
          balanceInCurrency: 2000,
          balanceCurrencyDisplayValue: '2,000.00',
          logoUri: 'logo2',
          reputation: null,
          priceInCurrency: 2,
          marketCap: 200000,
          vol24: 2000,
          change24: 1,
        },
      },
    });
  });

  it('should handle errors from MoralisService', async () => {
    const addresses = ['address1'];
    const proxyApiUrl = 'https://proxy.api.url';
    const currency = 'USD';

    const errorResult = {
      address: 'address1',
      error: 'Some error',
    };

    mockMoralisService.getPortfolio.mockResolvedValueOnce(errorResult);

    const result = await getBalances({
      addresses,
      proxyApiUrl,
      currency,
      network,
      tokenService: mockTokenService,
    });

    expect(result).toEqual({
      address1: {
        error: 'Some error',
      },
    });
  });
});
