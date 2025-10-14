import {
  type GetBalancesParams,
  type TokenWithBalanceSVM,
  type TokenWithBalanceSPL,
  TokenType,
  type Error,
} from '@avalabs/vm-module-types';
import { TokenUnit } from '@avalabs/core-utils-sdk';
import type { VsCurrencyType } from '@avalabs/core-coingecko-sdk';

import { extractTokenMarketData, type TokenService } from '@internal/utils';
import { isFulfilled } from '@internal/utils/src/utils/is-promise-fulfilled';

import { SOL_DECIMALS } from '@src/constants';
import { MoralisService } from '@src/utils/moralis-service';
import { getNetworkName } from '@src/utils/get-network-name';

type GetSolanaBalancesResponse = Record<
  string,
  Record<string, TokenWithBalanceSVM | TokenWithBalanceSPL | Error> | Error
>;

export const getBalances = async ({
  addresses,
  proxyApiUrl,
  currency,
  network,
  tokenService,
}: GetBalancesParams & {
  proxyApiUrl: string;
  tokenService: TokenService;
}): Promise<GetSolanaBalancesResponse> => {
  const moralisService = new MoralisService({ proxyApiUrl });
  const coingeckoAssetId = network.pricingProviders?.coingecko.nativeTokenId ?? '';
  const coingeckoPlatformId = network.pricingProviders?.coingecko.assetPlatformId ?? '';
  const lowercaseCurrency = currency.toLowerCase() as VsCurrencyType;
  const solanaNetwork = getNetworkName(network);

  const portfolioResults = await Promise.all(
    addresses.map((address) => moralisService.getPortfolio({ address, network: solanaNetwork })),
  );

  const mints = new Set(
    portfolioResults.flatMap((result) => {
      if ('portfolio' in result) {
        return result.portfolio.tokens.map(({ mint }) => mint);
      }

      return [];
    }),
  );

  const tokenPricesPromises = await Promise.allSettled([
    coingeckoAssetId
      ? await tokenService.getSimplePrice({
          coinIds: [coingeckoAssetId],
          currencies: [lowercaseCurrency],
        })
      : Promise.resolve(undefined),
    coingeckoPlatformId
      ? await tokenService.getPricesByAddresses(Array.from(mints), coingeckoPlatformId, lowercaseCurrency)
      : Promise.resolve(undefined),
  ]);
  const [nativePrice, tokenPrices] = tokenPricesPromises.map((promise) =>
    isFulfilled(promise) ? promise.value : undefined,
  );

  return portfolioResults.reduce((portfolioAcc, result) => {
    if ('error' in result) {
      return {
        ...portfolioAcc,
        [result.address]: {
          error: result.error,
        },
      };
    }

    const nativeBalanceUnit = new TokenUnit(result.portfolio.nativeBalance.lamports, SOL_DECIMALS, 'SOL');
    const { priceInCurrency, marketCap, vol24, change24, tokenId } = extractTokenMarketData(
      coingeckoAssetId,
      lowercaseCurrency,
      nativePrice,
    );
    const nativeBalanceInCurrency = priceInCurrency !== undefined ? nativeBalanceUnit.mul(priceInCurrency) : undefined;

    const solanaBalance: TokenWithBalanceSVM = {
      type: TokenType.NATIVE,
      name: network.networkToken.name,
      symbol: network.networkToken.symbol,
      decimals: network.networkToken.decimals,
      balance: nativeBalanceUnit.toSubUnit(),
      balanceDisplayValue: nativeBalanceUnit.toString(),
      balanceInCurrency: nativeBalanceInCurrency?.toDisplay({ fixedDp: 2, asNumber: true }),
      balanceCurrencyDisplayValue: nativeBalanceInCurrency?.toDisplay({ fixedDp: 2 }),
      logoUri: network.networkToken.logoUri ?? '',
      coingeckoId: tokenId ?? '',
      priceInCurrency,
      marketCap,
      vol24,
      change24,
    };

    const tokenBalances = result.portfolio.tokens.reduce(
      (tokensAcc, { amountRaw, symbol, decimals, mint, name, logo }) => {
        const balanceUnit = new TokenUnit(amountRaw, decimals, symbol);
        const { priceInCurrency, marketCap, vol24, change24 } = extractTokenMarketData(
          mint,
          lowercaseCurrency,
          tokenPrices,
        );
        const balanceInCurrency = priceInCurrency !== undefined ? balanceUnit.mul(priceInCurrency) : undefined;

        const token: TokenWithBalanceSPL = {
          type: TokenType.SPL,
          address: mint,
          name,
          symbol,
          decimals,
          balance: balanceUnit.toSubUnit(),
          balanceDisplayValue: balanceUnit.toString(),
          balanceInCurrency: balanceInCurrency?.toDisplay({ fixedDp: 2, asNumber: true }),
          balanceCurrencyDisplayValue: balanceInCurrency?.toDisplay({ fixedDp: 2 }),
          logoUri: logo ?? undefined,
          reputation: null,
          priceInCurrency,
          marketCap,
          vol24,
          change24,
        };

        return {
          ...tokensAcc,
          [mint]: token,
        };
      },
      {} as Record<string, TokenWithBalanceSPL>,
    );

    return {
      ...portfolioAcc,
      [result.address]: {
        [network.networkToken.symbol]: solanaBalance,
        ...tokenBalances,
      },
    };
  }, {} as GetSolanaBalancesResponse);
};
