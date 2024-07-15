import { balanceToDisplayValue, bnToBig } from '@avalabs/utils-sdk';
import {
  TokenType,
  type TokenWithBalanceERC20,
  type NetworkContractToken,
  type TokenWithBalance,
} from '@avalabs/vm-module-types';
import { CurrencyCode, Erc20TokenBalance } from '@avalabs/glacier-sdk';
import BN from 'bn.js';
import type { GlacierService } from '@internal/utils';

export const getErc20Balances = async ({
  glacierService,
  currency,
  chainId,
  address,
  customTokens,
}: {
  glacierService: GlacierService;
  address: string;
  currency: string;
  chainId: number;
  customTokens: NetworkContractToken[];
}): Promise<Record<string, TokenWithBalance>> => {
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
