import { type GetBalancesParams, TokenType, type TokenWithBalanceBTC } from '@avalabs/vm-module-types';
import { TokenUnit } from '@avalabs/core-utils-sdk';
import type { VsCurrencyType } from '@avalabs/core-coingecko-sdk';

import { getNativeTokenMarketData, TokenService } from '@internal/utils';

import { getProvider } from '../../utils/get-provider';

type GetBtcBalancesResponse = Record<string, Record<string, TokenWithBalanceBTC>>;

type GetBTCBalancesParams = Omit<GetBalancesParams, 'currency'> & {
  proxyApiUrl: string;
  withScripts?: boolean;
  currency?: string;
  tokenService?: TokenService;
};

export const getBalances = async ({
  addresses,
  currency,
  network,
  withScripts = false,
  proxyApiUrl,
  tokenService,
}: GetBTCBalancesParams): Promise<GetBtcBalancesResponse> => {
  const provider = await getProvider({
    isTestnet: Boolean(network.isTestnet),
    proxyApiUrl,
  });

  const { priceInCurrency, change24, marketCap, vol24, tokenId } = tokenService
    ? await getNativeTokenMarketData({ network, tokenService, currency: currency?.toLowerCase() as VsCurrencyType })
    : {
        priceInCurrency: undefined,
        marketCap: undefined,
        vol24: undefined,
        change24: undefined,
      };

  const balances = await Promise.allSettled(
    addresses.map(async (address) => {
      const {
        balance: balanceInSatoshis,
        utxos,
        balanceUnconfirmed: unconfirmedBalanceInSatoshis,
        utxosUnconfirmed,
      } = await provider.getUtxoBalance(address, withScripts);

      const balance = new TokenUnit(balanceInSatoshis, network.networkToken.decimals, network.networkToken.symbol);
      const balanceInCurrency = priceInCurrency !== undefined ? balance.mul(priceInCurrency) : undefined;
      const balanceDisplayValue = balance.toDisplay();

      const unconfirmedBalance = new TokenUnit(
        unconfirmedBalanceInSatoshis,
        network.networkToken.decimals,
        network.networkToken.symbol,
      );
      const unconfirmedBalanceInCurrency =
        priceInCurrency !== undefined ? unconfirmedBalance.mul(priceInCurrency) : undefined;

      const symbol = network.networkToken.symbol;

      return {
        [address]: {
          [symbol]: {
            ...network.networkToken,
            utxos,
            utxosUnconfirmed,
            coingeckoId: tokenId ?? '',
            type: TokenType.NATIVE,
            balance: balance.toSubUnit(),
            balanceDisplayValue,
            balanceInCurrency: balanceInCurrency?.toDisplay({ fixedDp: 2, asNumber: true }),
            balanceCurrencyDisplayValue: balanceInCurrency?.toDisplay({ fixedDp: 2 }),
            priceInCurrency,
            marketCap,
            vol24,
            change24,
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
