import { TokenType, type GetBalancesParams, type GetBalancesResponse } from '@avalabs/vm-module-types';
import { bigToBN, balanceToDisplayValue } from '@avalabs/utils-sdk';
import type { VsCurrencyType } from '@avalabs/coingecko-sdk';
import Big from 'big.js';

import { TokenService } from '@internal/utils';

import { getProvider } from '../../utils/get-provider';
import { extractTokenMarketData } from '../../utils/extract-token-market-data';

type GetBTCBalancesParams = Omit<GetBalancesParams, 'currency'> & {
  proxyApiUrl: string;
  withScripts?: boolean;
  currency?: string;
};

export const getBalances = async ({
  addresses,
  currency,
  network,
  withScripts,
  proxyApiUrl,
  storage,
}: GetBTCBalancesParams): Promise<GetBalancesResponse> => {
  const provider = getProvider({
    isTestnet: Boolean(network.isTestnet),
    proxyApiUrl,
  });

  const tokenService = new TokenService({ proxyApiUrl, storage });
  const coingeckoTokenId = network.pricingProviders?.coingecko.nativeTokenId;
  const withPrices = typeof currency === 'string' && typeof coingeckoTokenId === 'string';
  const marketData = withPrices
    ? await tokenService.getSimplePrice({
        coinIds: [coingeckoTokenId],
        currencies: [currency] as VsCurrencyType[],
      })
    : undefined;
  const denomination = network.networkToken.decimals;
  const { priceInCurrency, change24, marketCap, vol24 } = extractTokenMarketData(
    coingeckoTokenId ?? '',
    currency,
    marketData,
  );

  const balances = await Promise.allSettled(
    addresses.map(async (address) => {
      const {
        balance: balanceInSatoshis,
        utxos,
        balanceUnconfirmed: unconfirmedBalanceInSatoshis,
        utxosUnconfirmed,
      } = await provider.getUtxoBalance(address, withScripts);

      const balanceBig = new Big(balanceInSatoshis).div(10 ** denomination);
      const balance = bigToBN(balanceBig, denomination);
      const balanceDisplayValue = balanceToDisplayValue(balance, denomination);
      const balanceInCurrency =
        priceInCurrency === undefined ? undefined : balanceBig.times(priceInCurrency).toNumber();

      const balanceCurrencyDisplayValue = balanceInCurrency?.toFixed(2);

      const unconfirmedBalanceBig = new Big(unconfirmedBalanceInSatoshis).div(10 ** denomination);
      const unconfirmedBalance = bigToBN(unconfirmedBalanceBig, denomination);
      const unconfirmedBalanceDisplayValue = balanceToDisplayValue(unconfirmedBalance, denomination);
      const unconfirmedBalanceInCurrency =
        priceInCurrency === undefined ? undefined : unconfirmedBalanceBig.times(priceInCurrency).toNumber();
      const unconfirmedBalanceCurrencyDisplayValue = unconfirmedBalanceInCurrency?.toFixed(2);

      const symbol = network.networkToken.symbol;

      return {
        [address]: {
          [symbol]: {
            ...network.networkToken,
            utxos,
            utxosUnconfirmed,
            coingeckoId: coingeckoTokenId ?? '',
            type: TokenType.NATIVE,
            balance,
            balanceDisplayValue,
            balanceInCurrency,
            balanceCurrencyDisplayValue,
            priceInCurrency,
            marketCap,
            vol24,
            change24,
            unconfirmedBalance,
            unconfirmedBalanceDisplayValue,
            unconfirmedBalanceInCurrency,
            unconfirmedBalanceCurrencyDisplayValue,
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
