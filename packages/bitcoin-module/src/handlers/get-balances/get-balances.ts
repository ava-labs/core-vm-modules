import { type GetBalancesParams, TokenType, type TokenWithBalanceBTC } from '@avalabs/vm-module-types';
import { TokenUnit } from '@avalabs/core-utils-sdk';
import type { VsCurrencyType } from '@avalabs/core-coingecko-sdk';

import { TokenService } from '@internal/utils';

import { getProvider } from '../../utils/get-provider';

type GetBtcBalancesResponse = Record<string, Record<string, TokenWithBalanceBTC>>;

type GetBTCBalancesParams = Omit<GetBalancesParams, 'currency'> & {
  proxyApiUrl: string;
  withScripts?: boolean;
  currency?: string;
};

export const getBalances = async ({
  addresses,
  currency,
  network,
  withScripts = false,
  proxyApiUrl,
  storage,
}: GetBTCBalancesParams): Promise<GetBtcBalancesResponse> => {
  const provider = await getProvider({
    isTestnet: Boolean(network.isTestnet),
    proxyApiUrl,
  });

  const tokenService = new TokenService({ proxyApiUrl, storage });
  const coingeckoTokenId = network.pricingProviders?.coingecko.nativeTokenId;
  const withPrices = typeof currency === 'string' && typeof coingeckoTokenId === 'string';
  const marketData = withPrices
    ? await tokenService.getWatchlistDataForToken({
        tokenDetails: {
          symbol: network.networkToken.symbol,
          isNative: true,
          caip2Id: network.caipId ?? '',
        },
        currency: currency as VsCurrencyType,
      })
    : undefined;

  const balances = await Promise.allSettled(
    addresses.map(async (address) => {
      const {
        balance: balanceInSatoshis,
        utxos,
        balanceUnconfirmed: unconfirmedBalanceInSatoshis,
        utxosUnconfirmed,
      } = await provider.getUtxoBalance(address, withScripts);

      const balance = new TokenUnit(balanceInSatoshis, network.networkToken.decimals, network.networkToken.symbol);
      const balanceInCurrency =
        marketData?.priceInCurrency !== undefined ? balance.mul(marketData.priceInCurrency) : undefined;
      const balanceDisplayValue = balance.toDisplay();

      const unconfirmedBalance = new TokenUnit(
        unconfirmedBalanceInSatoshis,
        network.networkToken.decimals,
        network.networkToken.symbol,
      );
      const unconfirmedBalanceInCurrency =
        marketData?.priceInCurrency !== undefined ? unconfirmedBalance.mul(marketData.priceInCurrency) : undefined;

      const symbol = network.networkToken.symbol;

      return {
        [address]: {
          [symbol]: {
            ...network.networkToken,
            utxos,
            utxosUnconfirmed,
            coingeckoId: coingeckoTokenId ?? '',
            type: TokenType.NATIVE,
            balance: balance.toSubUnit(),
            balanceDisplayValue,
            balanceInCurrency: balanceInCurrency?.toDisplay({ fixedDp: 2, asNumber: true }),
            balanceCurrencyDisplayValue: balanceInCurrency?.toDisplay({ fixedDp: 2 }),
            priceInCurrency: marketData?.priceInCurrency,
            marketCap: marketData?.marketCap,
            vol24: marketData?.vol24,
            change24: marketData?.change24,
            unconfirmedBalance: unconfirmedBalance.toSubUnit(),
            unconfirmedBalanceDisplayValue: unconfirmedBalance.toDisplay(),
            unconfirmedBalanceInCurrency: unconfirmedBalanceInCurrency?.toDisplay({
              fixedDp: 2,
              asNumber: true,
            }),
            unconfirmedBalanceCurrencyDisplayValue: unconfirmedBalanceInCurrency?.toDisplay({ fixedDp: 2 }),
          },
        },
      };
    }),
  );

  return balances.reduce((acc, accountBalance) => {
    if (accountBalance.status === 'rejected') {
      return acc;
    }

    return {
      ...acc,
      ...accountBalance.value,
    };
  }, {});
};
