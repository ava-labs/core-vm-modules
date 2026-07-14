import {
  TokenType,
  type GetBalancesParams,
  type GetBalancesResponse,
  type NetworkTokenWithBalance,
  type TokenWithBalance,
  type TokenWithBalanceHypercoreSpot,
} from '@avalabs/vm-module-types';
import type { HypercoreInfoClient } from '../../utils/info-client';
import { buildHypercoreTokens, type HypercoreTokenBalance } from '../../utils/build-hypercore-tokens';
import { hyperliquidCoinSvgUrl } from '../../utils/hyperliquid-coin-svg-url';
import { toHypercoreSpotTokens } from '../../utils/spot-tokens';

type GetHypercoreBalancesParams = Omit<GetBalancesParams, 'currency' | 'customTokens'> & {
  infoClient: HypercoreInfoClient;
};

const toTokenWithBalance = (
  token: HypercoreTokenBalance,
  networkToken: GetBalancesParams['network']['networkToken'],
): { key: string; value: TokenWithBalance } => {
  if (token.kind === 'native') {
    const balance = BigInt(token.balanceRaw);
    const balanceInCurrency = Number(token.balanceUsd);
    const native: NetworkTokenWithBalance = {
      ...networkToken,
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      logoUri: networkToken.logoUri ?? hyperliquidCoinSvgUrl(token.symbol),
      coingeckoId: 'usd-coin',
      type: TokenType.NATIVE,
      balance,
      balanceDisplayValue: token.balance,
      balanceInCurrency: Number.isFinite(balanceInCurrency) ? balanceInCurrency : 0,
      balanceCurrencyDisplayValue: token.balanceUsd,
      priceInCurrency: token.priceUsd,
    };
    return { key: token.symbol, value: native };
  }

  const balance = BigInt(token.balanceRaw);
  const spot: TokenWithBalanceHypercoreSpot = {
    type: TokenType.HYPERCORE_SPOT,
    name: token.name,
    symbol: token.symbol,
    decimals: token.decimals,
    index: token.index,
    evmContract: token.evmContract,
    logoUri: hyperliquidCoinSvgUrl(token.symbol),
    reputation: null,
    balance,
    balanceDisplayValue: token.balance,
  };
  return { key: `spot:${token.index}`, value: spot };
};

export const getBalances = async ({
  addresses,
  network,
  infoClient,
  tokenTypes = [TokenType.NATIVE, TokenType.HYPERCORE_SPOT],
}: GetHypercoreBalancesParams): Promise<GetBalancesResponse> => {
  const includeNative = tokenTypes.includes(TokenType.NATIVE);
  const includeSpot = tokenTypes.includes(TokenType.HYPERCORE_SPOT);

  if (!includeNative && !includeSpot) {
    return Object.fromEntries(addresses.map((address) => [address, {}]));
  }

  const spotMeta = await infoClient.getSpotMeta();
  const spotTokens = toHypercoreSpotTokens(spotMeta.tokens);

  const results = await Promise.allSettled(
    addresses.map(async (address) => {
      try {
        const [spotState, perpState, abstractionMode] = await Promise.all([
          infoClient.getSpotClearinghouseState(address),
          includeNative ? infoClient.getClearinghouseState(address).catch(() => undefined) : Promise.resolve(undefined),
          includeNative ? infoClient.getUserAbstraction(address).catch(() => undefined) : Promise.resolve(undefined),
        ]);

        const tokens = buildHypercoreTokens({
          spotBalances: spotState.balances,
          perpState,
          abstractionMode,
          spotTokens,
        }).filter((token) => (token.kind === 'native' ? includeNative : includeSpot));

        const bySymbol = Object.fromEntries(
          tokens.map((token) => {
            const { key, value } = toTokenWithBalance(token, network.networkToken);
            return [key, value];
          }),
        );

        return { [address]: bySymbol };
      } catch (err) {
        return { [address]: { error: (err as Error).toString() } };
      }
    }),
  );

  return results.reduce((acc, curr) => {
    if (curr.status === 'fulfilled') {
      return { ...acc, ...curr.value };
    }
    return acc;
  }, {} as GetBalancesResponse);
};
