import { TokenUnit, balanceToDisplayValue, bigToBN, bigintToBig, bnToBig } from '@avalabs/utils-sdk';
import {
  TokenType,
  type TokenWithBalanceERC20,
  type NetworkContractToken,
  type TokenWithBalance,
} from '@avalabs/vm-module-types';
import { ethers, type Provider } from 'ethers';
import ERC20 from '@openzeppelin/contracts/build/contracts/ERC20.json';
import { getTokens } from '../../get-tokens/get-tokens';
import type { TokenService } from '../../../token-service/token-service';
import { VsCurrencyType } from '@avalabs/coingecko-sdk';
import { JsonRpcBatchInternal } from '@avalabs/wallets-sdk';
import { CurrencyCode, Erc20TokenBalance, Glacier } from '@avalabs/glacier-sdk';
import BN from 'bn.js';

const DEFAULT_DECIMALS = 18;

export const getErc20Balances = async ({
  provider,
  tokenService,
  glacierSdk,
  currency,
  chainId,
  address,
  customTokens,
  coingeckoPlatformId,
  coingeckoTokenId,
  proxyApiUrl,
}: {
  provider: JsonRpcBatchInternal;
  tokenService: TokenService;
  glacierSdk: Glacier;
  currency: string;
  chainId: string;
  address: string;
  customTokens: NetworkContractToken[];
  proxyApiUrl: string;
  coingeckoPlatformId?: string;
  coingeckoTokenId?: string;
}) => {
  try {
    return getErc20BalanceFromGlacier({ glacierSdk, currency, chainId, address, customTokens });
  } catch {
    return getErc20BalancesFromCoingecko({
      provider,
      tokenService,
      coingeckoPlatformId,
      coingeckoTokenId,
      address,
      currency,
      chainId,
      proxyApiUrl,
      customTokens,
    });
  }
};

const getErc20BalancesFromCoingecko = async ({
  provider,
  tokenService,
  coingeckoPlatformId,
  coingeckoTokenId,
  address: userAddress,
  currency,
  chainId: caip2ChainId,
  proxyApiUrl,
  customTokens,
}: {
  provider: Provider;
  tokenService: TokenService;
  address: string;
  coingeckoPlatformId?: string;
  coingeckoTokenId?: string;
  currency: string;
  chainId: string;
  proxyApiUrl: string;
  customTokens: NetworkContractToken[];
}): Promise<Record<string, TokenWithBalance>> => {
  const chainId = caip2ChainId.split(':')[1];
  if (!chainId || isNaN(Number(chainId))) {
    throw new Error('Invalid chainId');
  }

  const tokens = await getTokens({ chainId: Number(chainId), proxyApiUrl });
  const activeTokenList = [...tokens, ...customTokens];
  const tokenAddresses = activeTokenList.map((token) => token.address);

  const tokensBalances = await Promise.allSettled(
    activeTokenList.map(async (token) => {
      const contract = new ethers.Contract(token.address, ERC20.abi, provider);
      const balanceBig = await contract.balanceOf?.(userAddress);
      const balance = new TokenUnit(balanceBig, token.decimals ?? DEFAULT_DECIMALS, token.symbol);

      const tokenWithBalance = {
        ...token,
        balance,
      };

      return tokenWithBalance;
    }),
  ).then((res) => {
    return res.reduce<(NetworkContractToken & { balance: TokenUnit })[]>((acc, result) => {
      return result.status === 'fulfilled' && !result.value.balance.isZero() ? [...acc, result.value] : acc;
    }, []);
  });

  if (!tokensBalances.length) return {};

  const simplePriceResponse =
    (coingeckoPlatformId &&
      (await tokenService.getPricesByAddresses(tokenAddresses, coingeckoPlatformId, currency as VsCurrencyType))) ||
    {};

  return tokensBalances.reduce(
    (acc, token) => {
      const priceInCurrency = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.price ?? 0;
      const marketCap = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.marketCap ?? 0;
      const vol24 = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.vol24 ?? 0;
      const change24 = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.change24 ?? 0;

      // todo: simply return TokenUnit when we have all modules implemented
      const balanceBig = bigintToBig(token.balance.toSubUnit(), token.balance.getMaxDecimals());
      const balance = bigToBN(balanceBig, token.balance.getMaxDecimals());
      const balanceInCurrency = Number(token.balance.mul(priceInCurrency).toSubUnit());
      const balanceDisplayValue = token.balance.toDisplay();
      const balanceCurrencyDisplayValue = token.balance.mul(priceInCurrency).toDisplay();

      return {
        ...acc,
        [token.address.toLowerCase()]: {
          ...token,
          type: TokenType.ERC20,
          balance,
          balanceDisplayValue,
          balanceInCurrency,
          balanceCurrencyDisplayValue,
          priceInCurrency,
          marketCap,
          change24,
          vol24,
        },
      };
    },
    {} as Record<string, TokenWithBalance>,
  );
};

const getErc20BalanceFromGlacier = async ({
  glacierSdk,
  currency,
  chainId: caip2ChainId,
  address,
  customTokens,
}: {
  glacierSdk: Glacier;
  address: string;
  currency: string;
  chainId: string;
  customTokens: NetworkContractToken[];
}): Promise<Record<string, TokenWithBalance>> => {
  const chainId = caip2ChainId.split(':')[1];
  if (!chainId || isNaN(Number(chainId))) {
    throw new Error('Invalid chainId');
  }

  const tokensWithBalance: TokenWithBalanceERC20[] = [];
  /**
   *  Load all pages to make sure we have all the tokens with balances
   */
  let nextPageToken: string | undefined;
  do {
    const response = await glacierSdk.evmBalances.listErc20Balances({
      chainId,
      address,
      currency: currency.toLocaleLowerCase() as CurrencyCode,
      // glacier has a cap on page size of 100
      pageSize: 100,
      pageToken: nextPageToken,
    });

    tokensWithBalance.push(...convertErc20ToTokenWithBalance(response.erc20TokenBalances, Number(chainId)));
    nextPageToken = response.nextPageToken;
  } while (nextPageToken);

  /**
   * Glacier doesnt return tokens without balances so we need to polyfill that list
   * from our own list of tokens. We just set the balance to 0, these zero balance
   * tokens are only used for swap, bridge and tx parsing.
   */
  return [
    ...convertNetworkTokenToTokenWithBalance(customTokens),
    ...tokensWithBalance, // this needs to be second in the list so it overwrites its zero balance counterpart if there is one
  ].reduce(
    (acc, token) => {
      return { ...acc, [token.address.toLowerCase()]: token };
    },
    {} as Record<string, TokenWithBalance>,
  );
};

const convertNetworkTokenToTokenWithBalance = (tokens: NetworkContractToken[]): TokenWithBalanceERC20[] => {
  return tokens.map((token) => {
    return {
      ...token,
      type: TokenType.ERC20,
      balance: new BN(0),
      balanceInCurrency: 0,
      balanceDisplayValue: '0',
      balanceCurrencyDisplayValue: '0',
      priceInCurrency: 0,
      marketCap: 0,
      change24: 0,
      vol24: 0,
    };
  });
};

const convertErc20ToTokenWithBalance = (
  tokenBalances: Erc20TokenBalance[],
  chainId: number,
): TokenWithBalanceERC20[] => {
  return tokenBalances.map((token: Erc20TokenBalance): TokenWithBalanceERC20 => {
    const balance = new BN(token.balance);
    const balanceDisplayValue = balanceToDisplayValue(balance, token.decimals);
    const balanceCurrencyDisplayValue = token.balanceValue?.value.toString() ?? '0';
    const priceInCurrency = token.price?.value ?? 0;
    const balanceInCurrency = bnToBig(balance, token.decimals).mul(priceInCurrency).toNumber();

    return {
      chainId,
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      logoUri: token.logoUri,
      balance,
      balanceCurrencyDisplayValue,
      balanceDisplayValue,
      balanceInCurrency,
      priceInCurrency,
      contractType: 'ERC-20',
      type: TokenType.ERC20,
      change24: 0,
      marketCap: 0,
      vol24: 0,
    };
  });
};
