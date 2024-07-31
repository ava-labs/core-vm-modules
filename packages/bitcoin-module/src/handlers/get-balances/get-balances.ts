import { type GetBalancesParams, TokenType, type TokenWithBalanceBTC } from '@avalabs/vm-module-types';
import { TokenUnit } from '@avalabs/utils-sdk';
import type { VsCurrencyType } from '@avalabs/coingecko-sdk';

import { TokenService } from '@internal/utils';

import { getProvider } from '../../utils/get-provider';
import { extractTokenMarketData } from '../../utils/extract-token-market-data';

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
  withScripts,
  proxyApiUrl,
  storage,
}: GetBTCBalancesParams): Promise<GetBtcBalancesResponse> => {
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

      const balance = new TokenUnit(balanceInSatoshis, network.networkToken.decimals, network.networkToken.symbol);
      const balanceDisplayValue = balance.toDisplay();
      const balanceCurrencyDisplayValue =
        priceInCurrency === undefined ? undefined : balance.mul(priceInCurrency).toDisplay(2);
      const balanceInCurrency =
        balanceCurrencyDisplayValue === undefined ? undefined : Number(balanceCurrencyDisplayValue.replaceAll(',', ''));

      const unconfirmedBalance = new TokenUnit(
        unconfirmedBalanceInSatoshis,
        network.networkToken.decimals,
        network.networkToken.symbol,
      );
      const unconfirmedBalanceDisplayValue = unconfirmedBalance.toDisplay();
      const unconfirmedBalanceCurrencyDisplayValue =
        priceInCurrency === undefined ? undefined : unconfirmedBalance.mul(priceInCurrency).toDisplay(2);
      const unconfirmedBalanceInCurrency =
        unconfirmedBalanceCurrencyDisplayValue !== undefined
          ? Number(unconfirmedBalanceCurrencyDisplayValue.replaceAll(',', ''))
          : undefined;

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
            balanceInCurrency,
            balanceCurrencyDisplayValue,
            priceInCurrency,
            marketCap,
            vol24,
            change24,
            unconfirmedBalance: unconfirmedBalance.toSubUnit(),
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
