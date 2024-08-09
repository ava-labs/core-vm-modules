import { DeBankService } from './debank-service';
import { DeBank, type DeBankChainInfo, type DeBankToken } from './de-bank';
import { CurrencyCode } from '@avalabs/glacier-sdk';
import { TokenType } from '@avalabs/vm-module-types';

jest.mock('./de-bank');

describe('DeBankService', () => {
  let deBankService: DeBankService;
  let mockDeBank: jest.Mocked<DeBank>;

  beforeEach(() => {
    mockDeBank = new DeBank('http://fake-url') as jest.Mocked<DeBank>;
    (DeBank as jest.Mock).mockReturnValue(mockDeBank);

    deBankService = new DeBankService({ proxyApiUrl: 'http://fake-url' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isNetworkSupported', () => {
    it('should return true if the network is supported', async () => {
      mockDeBank.isNetworkSupported.mockReturnValue(true);

      const result = await deBankService.isNetworkSupported(1);
      expect(result).toBe(true);
      expect(mockDeBank.isNetworkSupported).toHaveBeenCalledWith(1);
    });

    it('should return false if the network is not supported', async () => {
      mockDeBank.isNetworkSupported.mockReturnValue(false);

      const result = await deBankService.isNetworkSupported(999);
      expect(result).toBe(false);
      expect(mockDeBank.isNetworkSupported).toHaveBeenCalledWith(999);
    });
  });

  describe('getNativeBalance', () => {
    it('should throw an error if the address is not valid', async () => {
      await expect(
        deBankService.getNativeBalance({
          chainId: 1,
          address: 'invalidAddress',
          currency: CurrencyCode.USD,
        }),
      ).rejects.toThrow('getNativeBalance: not valid address: invalidAddress');
    });

    it('should throw an error if the chainId is not supported', async () => {
      await expect(
        deBankService.getNativeBalance({
          chainId: 999,
          address: '0x1234567890abcdef1234567890abcdef12345678',
          currency: CurrencyCode.USD,
        }),
      ).rejects.toThrow('getNativeBalance: not valid chainId: 999');
    });

    it('should return the correct native balance', async () => {
      const mockChainInfo = { wrapped_token_id: 'wrapped-token-id' } as unknown as DeBankChainInfo;
      const mockTokenBalance = {
        raw_amount: 1000000000000000000n,
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
        logo_url: 'http://logo.url',
        price: 2000,
      } as unknown as DeBankToken;

      mockDeBank.getChainInfo.mockResolvedValue(mockChainInfo);
      mockDeBank.getTokenBalance.mockResolvedValue(mockTokenBalance);

      const result = await deBankService.getNativeBalance({
        chainId: 42161,
        address: '0x1234567890abcdef1234567890abcdef12345678',
        currency: CurrencyCode.USD,
      });

      expect(result).toEqual({
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
        type: TokenType.NATIVE,
        logoUri: 'http://logo.url',
        balance: 1000000000000000000n,
        balanceDisplayValue: '1',
        balanceInCurrency: 2000,
        balanceCurrencyDisplayValue: '2,000.00',
        priceInCurrency: 2000,
      });
    });
  });

  describe('listErc20Balances', () => {
    it('should throw an error if the address is not valid', async () => {
      await expect(
        deBankService.listErc20Balances({
          chainId: 1,
          address: 'invalidAddress',
          currency: CurrencyCode.USD,
          pageSize: 10,
        }),
      ).rejects.toThrow('listErc20Balances: not valid address');
    });

    it('should throw an error if the chainId is not supported', async () => {
      await expect(
        deBankService.listErc20Balances({
          chainId: 999,
          address: '0x1234567890abcdef1234567890abcdef12345678',
          currency: CurrencyCode.USD,
          pageSize: 10,
        }),
      ).rejects.toThrow('getNativeBalance: not valid chainId: 999');
    });

    it('should return a list of ERC20 token balances', async () => {
      const mockChainInfo: DeBankChainInfo = {
        id: 'eth',
        is_support_pre_exec: false,
        logo_url: '',
        name: 'ethereum',
        wrapped_token_id: '0x0',
        native_token_id: 'native-token-id',
        community_id: 1,
      };
      const mockTokenList: DeBankToken[] = [
        { id: '0x1', symbol: 'DAI' } as unknown as DeBankToken,
        { id: '0x2', symbol: 'USDT' } as unknown as DeBankToken,
      ];
      const mockTokenBalance1: DeBankToken = {
        amount: 50000000000000000000n,
        chain: 'eth',
        is_core: false,
        is_wallet: false,
        optimized_symbol: 'DAI',
        protocol_id: '',
        time_at: 0,
        id: '0x1',
        raw_amount: 50000000000000000000n,
        decimals: 18,
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        logo_url: 'http://dai.logo.url',
        price: 1,
      };
      const mockTokenBalance2: DeBankToken = {
        amount: 100000000000000000000n,
        chain: 'eth',
        id: '0x2',
        is_core: false,
        is_wallet: false,
        optimized_symbol: 'USDT',
        protocol_id: '',
        time_at: 0,
        raw_amount: 100000000000000000000n,
        decimals: 18,
        symbol: 'USDT',
        name: 'Tether USD',
        logo_url: 'http://usdt.logo.url',
        price: 1,
      };

      mockDeBank.getChainInfo.mockResolvedValue(mockChainInfo);
      mockDeBank.getTokenList.mockResolvedValue(mockTokenList);
      mockDeBank.getTokenBalance.mockResolvedValueOnce(mockTokenBalance1).mockResolvedValueOnce(mockTokenBalance2);

      const result = await deBankService.listErc20Balances({
        chainId: 42161,
        address: '0x1234567890abcdef1234567890abcdef12345678',
        currency: CurrencyCode.USD,
        pageSize: 10,
      });

      expect(result).toEqual({
        '0x1': {
          chainId: 1,
          address: '0x1',
          name: 'Dai Stablecoin',
          symbol: 'DAI',
          decimals: 18,
          logoUri: 'http://dai.logo.url',
          balance: 50000000000000000000n,
          balanceDisplayValue: '50',
          balanceInCurrency: 50,
          balanceCurrencyDisplayValue: '50.00',
          priceInCurrency: 1,
          type: TokenType.ERC20,
        },
        '0x2': {
          chainId: 1,
          address: '0x2',
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: 18,
          logoUri: 'http://usdt.logo.url',
          balance: 100000000000000000000n,
          balanceDisplayValue: '100',
          balanceInCurrency: 100,
          balanceCurrencyDisplayValue: '100.00',
          priceInCurrency: 1,
          type: TokenType.ERC20,
        },
      });
    });
  });
});
