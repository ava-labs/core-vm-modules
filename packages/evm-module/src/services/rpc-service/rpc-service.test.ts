import { RpcService } from './rpc-service';
import {
  type ERC20Token,
  type Network,
  type NetworkContractToken,
  NetworkVMType,
  TokenType,
} from '@avalabs/vm-module-types';
import type { CurrencyCode } from '@avalabs/glacier-sdk';
import { getProvider } from '../../utils/get-provider';
import { TokenService } from '@internal/utils';
import { getTokens } from '../../handlers/get-tokens/get-tokens';
import { ethers } from 'ethers';

jest.mock('../../utils/get-provider');
jest.mock('@internal/utils/');
jest.mock('../../handlers/get-tokens/get-tokens');
jest.mock('ethers');

describe('RpcService', () => {
  let rpcService: RpcService;
  let mockNetwork: Network;
  let mockCustomTokens: NetworkContractToken[];
  let mockProxyApiUrl: string;

  beforeEach(() => {
    mockNetwork = {
      chainId: 1,
      vmName: NetworkVMType.EVM,
      chainName: 'MockChain',
      rpcUrl: 'https://mock-rpc.url',
      networkToken: { symbol: 'MOCK', decimals: 18, name: 'MTOKEN' },
      pricingProviders: {
        coingecko: {
          nativeTokenId: 'mock-token-id',
          assetPlatformId: 'mock-platform-id',
        },
      },
      utilityAddresses: {
        multicall: '0xMockMulticallAddress',
      },
    };
    mockCustomTokens = [];
    mockProxyApiUrl = 'https://mock-proxy.url';

    rpcService = new RpcService({
      network: mockNetwork,
      proxyApiUrl: mockProxyApiUrl,
      customTokens: mockCustomTokens,
    });
  });

  describe('isNetworkSupported', () => {
    it('should return true', async () => {
      const result = await rpcService.isNetworkSupported();
      expect(result).toBe(true);
    });
  });

  describe('getNativeBalance', () => {
    it('should return the correct native balance', async () => {
      const mockAddress = '0xMockAddress';
      const mockChainId = 1;
      const mockCurrency = 'usd' as CurrencyCode;
      const mockBalance = 1000000000000000000n;

      const mockProvider = {
        getBalance: jest.fn().mockResolvedValue(mockBalance),
      };

      (getProvider as jest.Mock).mockReturnValue(mockProvider);
      const mockTokenService = {
        getSimplePrice: jest.fn().mockResolvedValue({
          'mock-token-id': {
            usd: {
              price: 1000,
              marketCap: 1000000,
              vol24: 50000,
              change24: 2.5,
            },
          },
        }),
      };

      (TokenService as jest.Mock).mockReturnValue(mockTokenService);

      const result = await rpcService.getNativeBalance({
        chainId: mockChainId,
        address: mockAddress,
        currency: mockCurrency,
      });

      expect(getProvider).toHaveBeenCalledWith({
        chainId: mockChainId,
        chainName: mockNetwork.chainName,
        rpcUrl: mockNetwork.rpcUrl,
        multiContractAddress: mockNetwork.utilityAddresses?.multicall,
      });
      expect(mockProvider.getBalance).toHaveBeenCalledWith(mockAddress);
      expect(result.balance).toBe(mockBalance);
      expect(result.balanceDisplayValue).toBe('1');
      expect(result.priceInCurrency).toBe(1000);
      expect(result.balanceInCurrency).toBe(1000);
      expect(result.balanceCurrencyDisplayValue).toBe('1,000.00');
    });
  });

  describe('listErc20Balances', () => {
    it('should return the correct ERC20 token balances', async () => {
      const mockAddress = '0xMockAddress';
      const mockChainId = 1;
      const mockCurrency = 'usd' as CurrencyCode;
      const mockToken: ERC20Token = {
        name: 'MOCKY',
        type: TokenType.ERC20,
        address: '0xMockTokenAddress',
        symbol: 'MOCK',
        decimals: 18,
      };
      const mockBalanceBigInt = 1000000000000000000n;

      const mockProvider = {
        getBalance: jest.fn().mockResolvedValue(mockBalanceBigInt),
      };

      (getProvider as jest.Mock).mockReturnValue(mockProvider);
      (getTokens as jest.Mock).mockResolvedValue([mockToken]);

      const mockContract = {
        balanceOf: jest.fn().mockResolvedValue(mockBalanceBigInt),
      };
      (ethers.Contract as jest.Mock).mockReturnValue(mockContract);

      const mockTokenService = {
        getPricesByAddresses: jest.fn().mockResolvedValue({
          'mock-token-id': {
            usd: {
              price: 10,
              marketCap: 100000,
              vol24: 5000,
              change24: 1.5,
            },
          },
        }),
      };

      (TokenService as jest.Mock).mockReturnValue(mockTokenService);

      const result = await rpcService.listErc20Balances({
        chainId: mockChainId,
        address: mockAddress,
        currency: mockCurrency,
        pageSize: 10,
      });

      expect(getProvider).toHaveBeenCalledWith({
        chainId: mockChainId,
        chainName: mockNetwork.chainName,
        rpcUrl: mockNetwork.rpcUrl,
        multiContractAddress: mockNetwork.utilityAddresses?.multicall,
      });
      expect(getTokens).toHaveBeenCalledWith({
        chainId: mockChainId,
        proxyApiUrl: mockProxyApiUrl,
      });
      expect(result[mockToken.address.toLowerCase()]).toEqual({
        ...mockToken,
        balance: mockBalanceBigInt,
        balanceDisplayValue: '1',
        balanceCurrencyDisplayValue: '10.00',
        balanceInCurrency: 10,
        priceInCurrency: 10,
        marketCap: 100000,
        vol24: 5000,
        change24: 1.5,
        type: TokenType.ERC20,
        address: '0xMockTokenAddress',
        name: 'MOCKY',
        symbol: 'MOCK',
        decimals: 18,
      });
    });
  });
});
