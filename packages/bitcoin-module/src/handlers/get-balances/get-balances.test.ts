import type { BitcoinProvider } from '@avalabs/core-wallets-sdk';

import { getProvider } from '../../utils/get-provider';
import { getBalances } from './get-balances';
import { TokenType, type Network } from '@avalabs/vm-module-types';
import { TokenService } from '@internal/utils';
import { TokenUnit } from '@avalabs/core-utils-sdk';

jest.mock('../../utils/get-provider');

const proxyApiUrl = 'https://proxy.api/';

describe('get-balances', () => {
  const provider = { getUtxoBalance: jest.fn() } as unknown as BitcoinProvider;
  const nativeTokenId = 'btc-id';
  const network = {
    pricingProviders: {
      coingecko: {
        nativeTokenId,
      },
    },
    networkToken: {
      decimals: 8,
      symbol: 'BTC',
      name: 'Bitcoin',
    },
    isTestnet: false,
  } as const as Network;

  const mockedBalance = {
    balance: 15_000_000,
    balanceUnconfirmed: 5_000_000,
    utxos: [
      { txHash: 'utxo-1', index: 0, value: 10_000_000, blockHeight: 10, confirmations: 20 },
      { txHash: 'utxo-2', index: 1, value: 5_000_000, blockHeight: 15, confirmations: 5 },
    ],
    utxosUnconfirmed: [{ txHash: 'utxo-3', index: 2, value: 5_000_000, blockHeight: 20, confirmations: 0 }],
  };

  const marketData = {
    priceInCurrency: 50_000,
    marketCap: 1_500_000_000_000,
    vol24: 500_000_000_000,
    change24: 0.01,
  };

  beforeEach(() => {
    jest.mocked(provider.getUtxoBalance).mockResolvedValue(mockedBalance);
    jest.mocked(getProvider).mockResolvedValue(provider);

    jest.spyOn(TokenService.prototype, 'getWatchlistDataForToken').mockResolvedValue(marketData);
  });

  it('should build the provider and use it', async () => {
    await getBalances({
      addresses: [],
      network: {
        ...network,
        isTestnet: true,
      },
      proxyApiUrl,
    });

    expect(getProvider).toHaveBeenCalledWith({ isTestnet: true, proxyApiUrl });

    await getBalances({
      addresses: [],
      network: {
        ...network,
        isTestnet: false,
      },
      proxyApiUrl: 'https://proxy-dev.api/',
    });

    expect(getProvider).toHaveBeenCalledWith({ isTestnet: false, proxyApiUrl: 'https://proxy-dev.api/' });
  });

  it('should call getUtxoBalance() method without scripts', async () => {
    await getBalances({
      addresses: ['first-address'],
      network,
      proxyApiUrl,
    });

    expect(provider.getUtxoBalance).toHaveBeenCalledWith('first-address', false);
  });

  it('uses withScripts option when requested', async () => {
    await getBalances({
      addresses: ['first-address'],
      network,
      proxyApiUrl,
      withScripts: true,
    });

    expect(provider.getUtxoBalance).toHaveBeenCalledWith('first-address', true);
  });

  describe('when no currency is passed', () => {
    it('does not call the token service', async () => {
      jest.spyOn(TokenService.prototype, 'getSimplePrice');

      await getBalances({
        addresses: ['first-address'],
        network,
        proxyApiUrl,
      });

      expect(TokenService.prototype.getSimplePrice).not.toHaveBeenCalled();
    });

    it('does not return the price-related information', async () => {
      expect(
        await getBalances({
          addresses: ['first-address'],
          network,
          proxyApiUrl,
        }),
      ).toEqual({
        'first-address': {
          BTC: {
            ...network.networkToken,
            utxos: mockedBalance.utxos,
            utxosUnconfirmed: mockedBalance.utxosUnconfirmed,
            coingeckoId: network.pricingProviders?.coingecko?.nativeTokenId,
            type: TokenType.NATIVE,
            balance: new TokenUnit(mockedBalance.balance, 8, '').toSubUnit(),
            balanceDisplayValue: '0.15',
            balanceInCurrency: undefined,
            balanceCurrencyDisplayValue: undefined,
            priceInCurrency: undefined,
            marketCap: undefined,
            vol24: undefined,
            change24: undefined,
            unconfirmedBalance: new TokenUnit(mockedBalance.balanceUnconfirmed, 8, '').toSubUnit(),
            unconfirmedBalanceDisplayValue: '0.05',
            unconfirmedBalanceInCurrency: undefined,
            unconfirmedBalanceCurrencyDisplayValue: undefined,
          },
        },
      });
    });
  });

  it('maps returned balances to known model', async () => {
    expect(
      await getBalances({
        addresses: ['first-address'],
        currency: 'USD',
        network,
        proxyApiUrl,
      }),
    ).toEqual({
      'first-address': {
        BTC: {
          ...network.networkToken,
          utxos: mockedBalance.utxos,
          utxosUnconfirmed: mockedBalance.utxosUnconfirmed,
          coingeckoId: network.pricingProviders?.coingecko?.nativeTokenId,
          type: TokenType.NATIVE,
          balance: new TokenUnit(mockedBalance.balance, 8, '').toSubUnit(),
          balanceDisplayValue: '0.15',
          balanceInCurrency: 7500,
          balanceCurrencyDisplayValue: '7,500.00',
          priceInCurrency: 50_000,
          marketCap: 1_500_000_000_000,
          vol24: 500_000_000_000,
          change24: 0.01,
          unconfirmedBalance: new TokenUnit(mockedBalance.balanceUnconfirmed, 8, '').toSubUnit(),
          unconfirmedBalanceDisplayValue: '0.05',
          unconfirmedBalanceInCurrency: 2500,
          unconfirmedBalanceCurrencyDisplayValue: '2,500.00',
        },
      },
    });
  });
});
