import { TokenUnit } from '@avalabs/utils-sdk';
import {
  type ERC20Token,
  TokenType,
  type TokenWithBalanceEVM,
  type TokenWithBalanceERC20,
} from '@avalabs/vm-module-types';
import { CurrencyCode, Erc20TokenBalance } from '@avalabs/glacier-sdk';
import type { EvmGlacierService } from '../../../services/glacier-service/glacier-service';
import { DEFAULT_DECIMALS } from '../../../constants';

export const getErc20Balances = async ({
  glacierService,
  currency,
  chainId,
  address,
  customTokens,
}: {
  glacierService: EvmGlacierService;
  address: string;
  currency: string;
  chainId: number;
  customTokens: ERC20Token[];
}): Promise<Record<string, TokenWithBalanceEVM>> => {
  const tokensWithBalance: TokenWithBalanceERC20[] = [];
  /**
   *  Load all pages to make sure we have all the tokens with balances
   */
  let nextPageToken: string | undefined;
  do {
    const response = await glacierService.listErc20Balances({
      chainId: chainId.toString(),
      address,
      currency: currency.toLocaleLowerCase() as CurrencyCode,
      // glacier has a cap on page size of 100
      pageSize: 100,
      pageToken: nextPageToken,
    });

    tokensWithBalance.push(
      ...convertErc20TokenWithBalanceToTokenWithBalance(response.erc20TokenBalances, Number(chainId)),
    );
    nextPageToken = response.nextPageToken;
  } while (nextPageToken);

  /**
   * Glacier doesnt return tokens without balances so we need to polyfill that list
   * from our own list of tokens. We just set the balance to 0, these zero balance
   * tokens are only used for swap, bridge and tx parsing.
   */
  return [
    ...convertErc20TokenToTokenWithBalance(customTokens),
    ...tokensWithBalance, // this needs to be second in the list so it overwrites its zero balance counterpart if there is one
  ].reduce(
    (acc, token) => {
      return { ...acc, [token.address.toLowerCase()]: token };
    },
    {} as Record<string, TokenWithBalanceEVM>,
  );
};

const convertErc20TokenToTokenWithBalance = (tokens: ERC20Token[]): TokenWithBalanceERC20[] => {
  return tokens.map((token) => {
    return {
      ...token,
      decimals: token.decimals ?? DEFAULT_DECIMALS,
      type: TokenType.ERC20,
      balance: 0n,
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

const convertErc20TokenWithBalanceToTokenWithBalance = (
  tokenBalances: Erc20TokenBalance[],
  chainId: number,
): TokenWithBalanceERC20[] => {
  return tokenBalances.map((token: Erc20TokenBalance): TokenWithBalanceERC20 => {
    const balance = new TokenUnit(token.balance, token.decimals, token.symbol);
    const balanceDisplayValue = balance.toDisplay();
    const balanceCurrencyDisplayValue = token.balanceValue?.value.toString();
    const priceInCurrency = token.price?.value;
    const balanceInCurrency = priceInCurrency ? Number(balance.mul(priceInCurrency).toDisplay(2)) : undefined;

    return {
      chainId,
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      logoUri: token.logoUri,
      balance: balance.toSubUnit(),
      balanceCurrencyDisplayValue,
      balanceDisplayValue,
      balanceInCurrency,
      priceInCurrency,
      type: TokenType.ERC20,
    };
  });
};
