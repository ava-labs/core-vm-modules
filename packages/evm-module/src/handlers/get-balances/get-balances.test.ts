import { NetworkVMType, TokenType } from '@avalabs/vm-module-types';
import { getBalances } from './get-balances';
import * as GlacierNativeToken from './glacier-balance-service/get-native-token-balances';
import { BN } from 'bn.js';
import * as GlacierERC20Token from './glacier-balance-service/get-erc20-balances';
import * as EvmNativeToken from './evm-balance-service/get-native-token-balances';
import * as EvmERC20Token from './evm-balance-service/get-erc20-balances';
import type { EvmGlacierService } from '../../services/glacier-service/glacier-service';

describe('get-balances', () => {
  it('should get balances from glacier', async () => {
    const mockGlacierService: EvmGlacierService = {
      ...expect.any(Object),
      isNetworkSupported: () => true,
      isHealthy: () => true,
    };
    jest.spyOn(GlacierNativeToken, 'getNativeTokenBalances').mockImplementationOnce(async () => {
      return {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
        type: TokenType.NATIVE,
        logoUri:
          'https://images.ctfassets.net/gcj8jwzm6086/6l56QLVZmvacuBfjHBTThP/791d743dd2c526692562780c2325fedf/eth-circle__1_.svg',
        balance: new BN(1),
        balanceDisplayValue: '1',
        balanceInCurrency: 1,
        balanceCurrencyDisplayValue: '1',
        priceInCurrency: 1,
        marketCap: 0,
        vol24: 0,
        change24: 0,
        coingeckoId: '',
      };
    });

    jest.spyOn(GlacierERC20Token, 'getErc20Balances').mockImplementationOnce(async () => {
      return {
        '0x123': {
          chainId: 1,
          address: '0x123',
          name: 'DAI',
          symbol: 'DAI',
          decimals: 18,
          logoUri: 'https://s3.us-east-2.amazonaws.com/nomics-api/static/images/currencies/dai.svg',
          balance: new BN(1),
          balanceCurrencyDisplayValue: '1',
          balanceDisplayValue: '1',
          balanceInCurrency: 1,
          priceInCurrency: 1,
          contractType: 'ERC-20',
          type: TokenType.ERC20,
          change24: 0,
          marketCap: 0,
          vol24: 0,
        },
      };
    });
    const balances = await getBalances({
      addresses: ['0x123'],
      currency: 'USD',
      network: {
        chainId: 1,
        chainName: 'Ethereum',
        isTestnet: false,
        networkToken: {
          name: 'Ether',
          decimals: 18,
          symbol: 'ETH',
          description:
            'Ether is used to pay for transaction fees and computational services on Etherum. Users can send Ether to other users, and developers can write smart contracts that receive, hold, and send Ether.',
          logoUri:
            'https://images.ctfassets.net/gcj8jwzm6086/6l56QLVZmvacuBfjHBTThP/791d743dd2c526692562780c2325fedf/eth-circle__1_.svg',
        },
        pricingProviders: { coingecko: { nativeTokenId: 'ethereum', assetPlatformId: 'ethereum' } },
        rpcUrl: 'https://proxy-api.avax.network/proxy/infura/mainnet',
        utilityAddresses: { multicall: '0x5ba1e12693dc8f9c48aad8770482f4739beed696' },
        vmName: NetworkVMType.EVM,
      },
      proxyApiUrl: 'proxyApiUrl',
      glacierService: mockGlacierService,
    });
    expect(balances).toEqual({
      '0x123': {
        '0x123': {
          address: '0x123',
          balance: new BN(1),
          balanceCurrencyDisplayValue: '1',
          balanceDisplayValue: '1',
          balanceInCurrency: 1,
          chainId: 1,
          change24: 0,
          contractType: 'ERC-20',
          decimals: 18,
          logoUri: 'https://s3.us-east-2.amazonaws.com/nomics-api/static/images/currencies/dai.svg',
          marketCap: 0,
          name: 'DAI',
          priceInCurrency: 1,
          symbol: 'DAI',
          type: 'ERC20',
          vol24: 0,
        },
        ETH: {
          balance: new BN(1),
          balanceCurrencyDisplayValue: '1',
          balanceDisplayValue: '1',
          balanceInCurrency: 1,
          change24: 0,
          coingeckoId: '',
          decimals: 18,
          logoUri:
            'https://images.ctfassets.net/gcj8jwzm6086/6l56QLVZmvacuBfjHBTThP/791d743dd2c526692562780c2325fedf/eth-circle__1_.svg',
          marketCap: 0,
          name: 'Ether',
          priceInCurrency: 1,
          symbol: 'ETH',
          type: 'NATIVE',
          vol24: 0,
        },
      },
    });
  });

  it('should get balances from evm', async () => {
    const mockGlacierService: EvmGlacierService = {
      ...expect.any(Object),
      isNetworkSupported: () => false,
      isHealthy: () => false,
    };
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              chainId: 2,
              address: '0x456',
              name: 'DAI2',
              symbol: 'DAI2',
              decimals: 18,
              logoUri: 'https://s3.us-east-2.amazonaws.com/nomics-api/static/images/currencies/dai.svg',
              contractType: 'ERC-20',
              type: TokenType.ERC20,
            },
          ]),
      }),
    ) as jest.Mock;
    jest.spyOn(EvmNativeToken, 'getNativeTokenBalances').mockImplementationOnce(async () => {
      return {
        name: 'Ether2',
        symbol: 'ETH2',
        decimals: 18,
        type: TokenType.NATIVE,
        logoUri:
          'https://images.ctfassets.net/gcj8jwzm6086/6l56QLVZmvacuBfjHBTThP/791d743dd2c526692562780c2325fedf/eth-circle__1_.svg',
        balance: new BN(1),
        balanceDisplayValue: '1',
        balanceInCurrency: 1,
        balanceCurrencyDisplayValue: '1',
        priceInCurrency: 1,
        marketCap: 0,
        vol24: 0,
        change24: 0,
        coingeckoId: '',
      };
    });

    jest.spyOn(EvmERC20Token, 'getErc20Balances').mockImplementationOnce(async () => {
      return {
        '0x456': {
          chainId: 2,
          address: '0x456',
          name: 'DAI2',
          symbol: 'DAI2',
          decimals: 18,
          logoUri: 'https://s3.us-east-2.amazonaws.com/nomics-api/static/images/currencies/dai.svg',
          balance: new BN(1),
          balanceCurrencyDisplayValue: '1',
          balanceDisplayValue: '1',
          balanceInCurrency: 1,
          priceInCurrency: 1,
          contractType: 'ERC-20',
          type: TokenType.ERC20,
          change24: 0,
          marketCap: 0,
          vol24: 0,
        },
      };
    });
    const balances = await getBalances({
      addresses: ['0x456'],
      currency: 'USD',
      network: {
        chainId: 2,
        chainName: '2',
        isTestnet: false,
        networkToken: {
          name: 'Ether2',
          decimals: 18,
          symbol: 'ETH2',
          description:
            'Ether is used to pay for transaction fees and computational services on Etherum. Users can send Ether to other users, and developers can write smart contracts that receive, hold, and send Ether.',
          logoUri:
            'https://images.ctfassets.net/gcj8jwzm6086/6l56QLVZmvacuBfjHBTThP/791d743dd2c526692562780c2325fedf/eth-circle__1_.svg',
        },
        pricingProviders: { coingecko: { nativeTokenId: 'ethereum', assetPlatformId: 'ethereum' } },
        rpcUrl: 'https://proxy-api.avax.network/proxy/infura/mainnet',
        utilityAddresses: { multicall: '0x5ba1e12693dc8f9c48aad8770482f4739beed696' },
        vmName: NetworkVMType.EVM,
      },
      proxyApiUrl: 'proxyApiUrl',
      glacierService: mockGlacierService,
    });
    expect(balances).toEqual({
      '0x456': {
        '0x456': {
          address: '0x456',
          balance: new BN(1),
          balanceCurrencyDisplayValue: '1',
          balanceDisplayValue: '1',
          balanceInCurrency: 1,
          chainId: 2,
          change24: 0,
          contractType: 'ERC-20',
          decimals: 18,
          logoUri: 'https://s3.us-east-2.amazonaws.com/nomics-api/static/images/currencies/dai.svg',
          marketCap: 0,
          name: 'DAI2',
          priceInCurrency: 1,
          symbol: 'DAI2',
          type: 'ERC20',
          vol24: 0,
        },
        ETH2: {
          balance: new BN(1),
          balanceCurrencyDisplayValue: '1',
          balanceDisplayValue: '1',
          balanceInCurrency: 1,
          change24: 0,
          coingeckoId: '',
          decimals: 18,
          logoUri:
            'https://images.ctfassets.net/gcj8jwzm6086/6l56QLVZmvacuBfjHBTThP/791d743dd2c526692562780c2325fedf/eth-circle__1_.svg',
          marketCap: 0,
          name: 'Ether2',
          priceInCurrency: 1,
          symbol: 'ETH2',
          type: 'NATIVE',
          vol24: 0,
        },
      },
    });
  });
});
