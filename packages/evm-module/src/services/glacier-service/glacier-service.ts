import {
  CurrencyCode,
  Erc1155Token,
  Erc20TokenBalance,
  Erc721Token,
  Glacier,
  type ListErc1155BalancesResponse,
  type ListErc721BalancesResponse,
} from '@avalabs/glacier-sdk';
import type { BalanceServiceInterface } from '../../handlers/get-balances/balance-service-interface';
import { TokenUnit } from '@avalabs/core-utils-sdk';
import {
  type ERC20Token,
  type NetworkTokenWithBalance,
  TokenType,
  type TokenWithBalanceERC20,
  type TokenWithBalanceEVM,
} from '@avalabs/vm-module-types';
import { DEFAULT_DECIMALS } from '../../constants';

class GlacierUnhealthyError extends Error {
  override message = 'Glacier is unhealthy. Try again later.';
}

export class EvmGlacierService implements BalanceServiceInterface {
  glacierSdk: Glacier;
  isGlacierHealthy = true;
  supportedChainIds: string[] = [];

  constructor({ glacierApiUrl }: { glacierApiUrl: string }) {
    this.glacierSdk = new Glacier({ BASE: glacierApiUrl });
    /**
     * This is for performance, basically we just cache the health of glacier every 5 seconds and
     * go off of that instead of every request
     */
    this.getSupportedChainIds().catch(() => {
      // Noop. It will be retried by .isSupportedNetwork calls upon unlocking if necessary.
    });
  }

  isHealthy = (): boolean => this.isGlacierHealthy;

  setGlacierToUnhealthy(): void {
    this.isGlacierHealthy = false;
    setTimeout(
      () => {
        this.isGlacierHealthy = true;
      },
      5 * 60 * 1000,
    ); // 5 minutes
  }

  async isNetworkSupported(chainId: number): Promise<boolean> {
    const chainIds = await this.getSupportedChainIds();
    return chainIds.some((id) => id === chainId.toString());
  }

  async getSupportedChainIds(): Promise<string[]> {
    if (this.supportedChainIds.length) {
      return this.supportedChainIds;
    }

    try {
      const supportedChains = await this.glacierSdk.evmChains.supportedChains({});
      this.supportedChainIds = supportedChains.chains.map((chain) => chain.chainId);
      return this.supportedChainIds;
    } catch {
      return [];
    }
  }

  async reindexNft({
    address,
    chainId,
    tokenId,
  }: {
    address: string;
    chainId: string;
    tokenId: string;
  }): Promise<void> {
    try {
      await this.glacierSdk.nfTs.reindexNft({
        address,
        chainId,
        tokenId,
      });
    } catch (error) {
      if (error instanceof GlacierUnhealthyError) {
        this.setGlacierToUnhealthy();
      }
      throw error;
    }
  }

  async getTokenDetails({
    address,
    chainId,
    tokenId,
  }: {
    address: string;
    chainId: string;
    tokenId: string;
  }): Promise<Erc721Token | Erc1155Token> {
    try {
      return this.glacierSdk.nfTs.getTokenDetails({
        address,
        chainId,
        tokenId,
      });
    } catch (error) {
      if (error instanceof GlacierUnhealthyError) {
        this.setGlacierToUnhealthy();
      }
      throw error;
    }
  }

  async getNativeBalance({
    chainId,
    address,
    currency,
    coingeckoId,
  }: {
    chainId: number;
    address: string;
    currency: CurrencyCode;
    coingeckoId?: string;
  }): Promise<NetworkTokenWithBalance> {
    try {
      const nativeBalance = await this.glacierSdk.evmBalances.getNativeBalance({
        chainId: chainId.toString(),
        address,
        currency: currency.toLocaleLowerCase() as CurrencyCode,
      });

      const nativeTokenBalance = nativeBalance.nativeTokenBalance;
      const balanceTokenUnit = new TokenUnit(
        nativeTokenBalance.balance,
        nativeTokenBalance.decimals,
        nativeTokenBalance.symbol,
      );
      const balanceDisplayValue = balanceTokenUnit.toDisplay();
      const priceInCurrency = nativeTokenBalance.price?.value;
      const balanceCurrencyDisplayValue = priceInCurrency
        ? balanceTokenUnit.mul(priceInCurrency).toDisplay(2)
        : undefined;
      const balanceInCurrency = balanceCurrencyDisplayValue
        ? Number(balanceCurrencyDisplayValue.replaceAll(',', ''))
        : undefined;

      return {
        name: nativeTokenBalance.name,
        symbol: nativeTokenBalance.symbol,
        decimals: nativeTokenBalance.decimals,
        type: TokenType.NATIVE,
        logoUri: nativeTokenBalance.logoUri,
        balance: balanceTokenUnit.toSubUnit(),
        balanceDisplayValue,
        balanceInCurrency,
        balanceCurrencyDisplayValue,
        priceInCurrency,
        coingeckoId: coingeckoId ?? '',
      };
    } catch (error) {
      if (error instanceof GlacierUnhealthyError) {
        this.setGlacierToUnhealthy();
      }
      throw error;
    }
  }

  async listErc721Balances({
    chainId,
    address,
    pageSize,
    pageToken,
  }: {
    chainId: string;
    address: string;
    pageSize: number;
    pageToken?: string;
  }): Promise<ListErc721BalancesResponse> {
    try {
      return this.glacierSdk.evmBalances.listErc721Balances({
        chainId,
        address,
        pageSize,
        pageToken,
      });
    } catch (error) {
      if (error instanceof GlacierUnhealthyError) {
        this.setGlacierToUnhealthy();
      }
      throw error;
    }
  }

  async listErc1155Balances({
    chainId,
    address,
    pageSize,
    pageToken,
  }: {
    chainId: string;
    address: string;
    pageSize: number;
    pageToken?: string;
  }): Promise<ListErc1155BalancesResponse> {
    try {
      return this.glacierSdk.evmBalances.listErc1155Balances({
        chainId,
        address,
        pageSize,
        pageToken,
      });
    } catch (error) {
      if (error instanceof GlacierUnhealthyError) {
        this.setGlacierToUnhealthy();
      }
      throw error;
    }
  }

  async listErc20Balances({
    chainId,
    address,
    currency,
    customTokens,
  }: {
    chainId: number;
    address: string;
    currency: CurrencyCode;
    customTokens: ERC20Token[];
  }): Promise<Record<string, TokenWithBalanceEVM>> {
    try {
      const tokensWithBalance: TokenWithBalanceERC20[] = [];
      /**
       *  Load all pages to make sure we have all the tokens with balances
       */
      let nextPageToken: string | undefined = undefined;
      do {
        const response = await this.glacierSdk.evmBalances.listErc20Balances({
          chainId: chainId.toString(),
          address,
          currency: currency.toLocaleLowerCase() as CurrencyCode,
          pageSize: 100, // glacier has a cap on page size of 100
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
    } catch (error) {
      if (error instanceof GlacierUnhealthyError) {
        this.setGlacierToUnhealthy();
      }
      throw error;
    }
  }

  async listTransactions({
    chainId,
    address,
    pageToken,
    pageSize,
  }: {
    chainId: string;
    address: string;
    pageToken?: string;
    pageSize?: number;
  }) {
    try {
      return this.glacierSdk.evmTransactions.listTransactions({
        chainId,
        address,
        pageToken,
        pageSize,
      });
    } catch (error) {
      if (error instanceof GlacierUnhealthyError) {
        this.setGlacierToUnhealthy();
      }
      throw error;
    }
  }
}

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
    const balanceInCurrency = priceInCurrency
      ? Number(balance.mul(priceInCurrency).toDisplay(2).replaceAll(',', ''))
      : undefined;

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
