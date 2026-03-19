import { TokenUnit } from '@avalabs/core-utils-sdk';
import {
  CurrencyCode,
  Erc1155Token,
  Erc1155TokenBalance,
  Erc20TokenBalance,
  Erc721Token,
  Erc721TokenBalance,
  Glacier,
} from '@avalabs/glacier-sdk';
import {
  type ERC20Token,
  type Error,
  type NetworkTokenWithBalance,
  type NftTokenWithBalance,
  TokenType,
  type TokenWithBalanceERC20,
  type TokenWithBalanceEVM,
} from '@avalabs/vm-module-types';

import { ChainId } from '@avalabs/core-chains-sdk';
import { GlacierFetchHttpRequest } from '@internal/utils';
import { DEFAULT_DECIMALS } from '@src/constants';
import type { BalanceServiceInterface } from '@src/handlers/get-balances/balance-service-interface';
import { getSmallImageForNFT } from '@src/utils/get-small-image-for-nft';

class GlacierUnhealthyError extends Error {
  override message = 'Glacier is unhealthy. Try again later.';
}

const CHAINS_TO_FILTER = [ChainId.ETHEREUM_HOMESTEAD];

type GlacierServiceConfig = {
  glacierApiUrl: string;
  headers?: Record<string, string>;
};

export class EvmGlacierService implements BalanceServiceInterface {
  glacierSdk: Glacier;
  isGlacierHealthy = true;
  supportedChainIds: string[] = [];

  constructor({ glacierApiUrl, headers }: GlacierServiceConfig) {
    this.glacierSdk = new Glacier(
      {
        BASE: glacierApiUrl,
        HEADERS: headers,
      },
      GlacierFetchHttpRequest,
    );
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
      /*
       * https://ava-labs.atlassian.net/browse/CP-9855
       * We are removing the support for Ethereum chain, so it is queried from DeBank instead
       */
      this.supportedChainIds = supportedChains.chains
        .map((chain) => chain.chainId)
        .filter((chainId) => !CHAINS_TO_FILTER.includes(Number(chainId)));
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
      const balance = new TokenUnit(nativeTokenBalance.balance, nativeTokenBalance.decimals, nativeTokenBalance.symbol);
      const priceInCurrency = nativeTokenBalance.price?.value;
      const balanceInCurrency = priceInCurrency !== undefined ? balance.mul(priceInCurrency) : undefined;

      return {
        name: nativeTokenBalance.name,
        symbol: nativeTokenBalance.symbol,
        decimals: nativeTokenBalance.decimals,
        type: TokenType.NATIVE,
        logoUri: nativeTokenBalance.logoUri,
        balance: balance.toSubUnit(),
        balanceDisplayValue: balance.toDisplay(),
        balanceInCurrency: balanceInCurrency?.toDisplay({ fixedDp: 2, asNumber: true }),
        balanceCurrencyDisplayValue: balanceInCurrency?.toDisplay({ fixedDp: 2 }),
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

  async listErc721Balances({ chainId, address }: { chainId: string; address: string }): Promise<Erc721TokenBalance[]> {
    /**
     *  Load all pages to make sure we have all the tokens with balances
     */
    let nextPageToken: string | undefined = undefined;
    const tokens: Erc721TokenBalance[] = [];
    do {
      try {
        const response = await this.glacierSdk.evmBalances.listErc721Balances({
          chainId,
          address,
          pageSize: 100,
          pageToken: nextPageToken,
        });

        tokens.push(...response.erc721TokenBalances);

        nextPageToken = response.nextPageToken;
      } catch (error) {
        if (error instanceof GlacierUnhealthyError) {
          this.setGlacierToUnhealthy();
        }
        throw error;
      }
    } while (nextPageToken);

    return tokens;
  }

  async listErc1155Balances({
    chainId,
    address,
  }: {
    chainId: string;
    address: string;
  }): Promise<Erc1155TokenBalance[]> {
    /**
     *  Load all pages to make sure we have all the tokens with balances
     */
    let nextPageToken: string | undefined = undefined;
    const tokens: Erc1155TokenBalance[] = [];
    do {
      try {
        const response = await this.glacierSdk.evmBalances.listErc1155Balances({
          chainId,
          address,
          pageSize: 100,
          pageToken: nextPageToken,
        });

        tokens.push(...response.erc1155TokenBalances);

        nextPageToken = response.nextPageToken;
      } catch (error) {
        if (error instanceof GlacierUnhealthyError) {
          this.setGlacierToUnhealthy();
        }
        throw error;
      }
    } while (nextPageToken);

    return tokens;
  }

  async listNftBalances({
    chainId,
    address,
  }: {
    chainId: number;
    address: string;
  }): Promise<Record<string, NftTokenWithBalance | Error>> {
    const balances = await Promise.allSettled([
      this.listErc721Balances({ chainId: chainId.toString(), address }),
      this.listErc1155Balances({ chainId: chainId.toString(), address }),
    ]);

    const entries = balances
      .filter(
        (
          tokenlist,
        ): tokenlist is PromiseFulfilledResult<Erc721TokenBalance[]> | PromiseFulfilledResult<Erc1155TokenBalance[]> =>
          tokenlist.status === 'fulfilled',
      )
      .flatMap((tokenlist) => {
        return (
          tokenlist.value
            // We filter out erc1155s with 0 balance, which Glacier returns for some reason
            .filter((token) => token.ercType === Erc721Token.ercType.ERC_721 || BigInt(token.balance) > 0n)
            .map((token) => {
              return [
                `${token.address}-${token.tokenId}`,
                {
                  address: token.address,
                  description: token.metadata.description ?? '',
                  logoUri: token.metadata.imageUri ?? '',
                  logoSmall: getSmallImageForNFT(token.metadata.imageUri ?? ''),
                  name: token.metadata.name ?? '',
                  symbol: token.metadata.symbol ?? '',
                  tokenId: token.tokenId,
                  tokenUri: token.tokenUri,
                  chainId,
                  // glacier does not provide the collection name information
                  collectionName: 'Unknown',
                  balance: token.ercType === Erc1155Token.ercType.ERC_1155 ? BigInt(token.balance) : 1,
                  balanceDisplayValue: token.ercType === Erc1155Token.ercType.ERC_1155 ? token.balance : '1',
                  type: token.ercType === Erc721Token.ercType.ERC_721 ? TokenType.ERC721 : TokenType.ERC1155,
                  metadata: {
                    indexStatus: token.metadata.indexStatus,
                    description: token.metadata.description,
                    lastUpdatedTimestamp: token.metadata.metadataLastUpdatedTimestamp,
                    properties:
                      token.ercType === Erc721Token.ercType.ERC_721
                        ? token.metadata.attributes
                        : token.metadata.properties,
                  },
                },
              ];
            })
        );
      });

    return Object.fromEntries(entries);
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
  }): Promise<Record<string, TokenWithBalanceEVM | Error>> {
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
      return this.glacierSdk.evmTransactions.listTransactionsV2({
        chainId,
        address,
        pageToken,
        pageSize,
        filterSpamTokens: true,
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
      reputation: null,
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
    const balanceInCurrency =
      priceInCurrency !== undefined
        ? balance.mul(priceInCurrency).toDisplay({ fixedDp: 2, asNumber: true })
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
      reputation: token.tokenReputation,
      type: TokenType.ERC20,
    };
  });
};
