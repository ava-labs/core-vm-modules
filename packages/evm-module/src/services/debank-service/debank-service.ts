import { CurrencyCode } from '@avalabs/glacier-sdk';
import type { BalanceServiceInterface, TokenId } from '@src/handlers/get-balances/balance-service-interface';
import { TokenUnit } from '@avalabs/core-utils-sdk';
import { isHexString } from 'ethers';
import {
  type Error,
  type NetworkTokenWithBalance,
  type NftTokenWithBalance,
  TokenType,
  type TokenWithBalanceEVM,
} from '@avalabs/vm-module-types';
import { DeBank, type DeBankChainInfo, type DeBankNftToken } from './de-bank';
import { rpcErrors } from '@metamask/rpc-errors';
import { getExchangeRates } from '@internal/utils';
import { getSmallImageForNFT } from '@src/utils/get-small-image-for-nft';

export class DeBankService implements BalanceServiceInterface {
  #deBank: DeBank;

  constructor({ proxyApiUrl }: { proxyApiUrl: string }) {
    this.#deBank = new DeBank(`${proxyApiUrl}/proxy/debank`);
  }

  async isNetworkSupported(chainId: number): Promise<boolean> {
    return this.#deBank.isNetworkSupported(chainId);
  }

  async #getChainInfo(chainId: number): Promise<{ chainInfo: DeBankChainInfo; chainIdString: string }> {
    const chainList = await this.#deBank.getChainList();
    const chainIdString = chainList.find((value) => value.community_id === chainId)?.id;
    if (!chainIdString) {
      throw rpcErrors.invalidParams('getNativeBalance: not valid chainId: ' + chainId);
    }

    const chainInfo = await this.#deBank.getChainInfo({ chainId: chainIdString });

    if (!chainInfo) {
      throw rpcErrors.invalidParams('getNativeBalance: not valid chainId: ' + chainId);
    }

    return {
      chainInfo,
      chainIdString,
    };
  }

  async getNativeBalance({
    chainId,
    address,
    currency,
  }: {
    chainId: number;
    address: string;
    currency: CurrencyCode;
  }): Promise<NetworkTokenWithBalance> {
    if (!isHexString(address)) throw rpcErrors.invalidParams('getNativeBalance: not valid address: ' + address);
    const { chainInfo, chainIdString } = await this.#getChainInfo(chainId);

    const tokenId = chainInfo.native_token_id;
    const nativeTokenBalance = await this.#deBank.getTokenBalance({ address, chainId: chainIdString, tokenId });
    const tokenUnit = new TokenUnit(
      nativeTokenBalance.raw_amount,
      nativeTokenBalance.decimals,
      nativeTokenBalance.symbol,
    );
    const balanceDisplayValue = tokenUnit.toDisplay();
    const exchangeRates = await getExchangeRates();
    const usdToCurrencyRate = exchangeRates.usd[currency.toLowerCase()];
    const priceInCurrency = usdToCurrencyRate ? usdToCurrencyRate * nativeTokenBalance.price : undefined;
    const balanceCurrencyDisplayValue = priceInCurrency
      ? tokenUnit.mul(priceInCurrency).toDisplay({ fixedDp: 2 })
      : undefined;
    const balanceInCurrency = priceInCurrency
      ? tokenUnit.mul(priceInCurrency).toDisplay({ fixedDp: 2, asNumber: true })
      : undefined;

    return {
      name: nativeTokenBalance.name,
      symbol: nativeTokenBalance.symbol,
      decimals: nativeTokenBalance.decimals,
      type: TokenType.NATIVE,
      logoUri: nativeTokenBalance.logo_url,
      balance: tokenUnit.toSubUnit(),
      balanceDisplayValue,
      balanceInCurrency,
      balanceCurrencyDisplayValue,
      priceInCurrency,
    } as NetworkTokenWithBalance;
  }

  async listErc20Balances({
    chainId,
    address,
    currency,
  }: {
    chainId: number;
    address: string;
    currency: CurrencyCode;
    pageSize: number;
    pageToken?: string;
  }): Promise<Record<TokenId, TokenWithBalanceEVM | Error>> {
    if (!isHexString(address)) throw rpcErrors.invalidParams('listErc20Balances: not valid address');
    const { chainInfo, chainIdString } = await this.#getChainInfo(chainId);

    const tokenBalances = await this.#deBank.getTokensBalanceOnChain({ chainId: chainIdString, address });
    const exchangeRates = await getExchangeRates();

    const erc20TokenBalances: Record<TokenId, TokenWithBalanceEVM | Error> = {};

    for (const tokenBalance of tokenBalances) {
      // skip native token or tokens which are not core tokens
      if (tokenBalance.id === chainInfo.native_token_id || tokenBalance.is_core === false) {
        continue;
      }

      const tokenUnit = new TokenUnit(tokenBalance.raw_amount, tokenBalance.decimals, tokenBalance.symbol);
      const balanceDisplayValue = tokenUnit.toDisplay();
      const usdToCurrencyRate = exchangeRates.usd[currency.toLowerCase()];
      const priceInCurrency = usdToCurrencyRate ? usdToCurrencyRate * tokenBalance.price : undefined;
      const balanceCurrencyDisplayValue = priceInCurrency
        ? tokenUnit.mul(priceInCurrency).toDisplay({ fixedDp: 2 })
        : undefined;
      const balanceInCurrency = priceInCurrency
        ? tokenUnit.mul(priceInCurrency).toDisplay({ fixedDp: 2, asNumber: true })
        : undefined;

      erc20TokenBalances[tokenBalance.id] = {
        chainId: chainInfo.community_id,
        address: tokenBalance.id,
        name: tokenBalance.name,
        symbol: tokenBalance.symbol,
        decimals: tokenBalance.decimals,
        logoUri: tokenBalance.logo_url,
        balance: tokenUnit.toSubUnit(),
        balanceCurrencyDisplayValue,
        balanceDisplayValue,
        balanceInCurrency,
        priceInCurrency,
        type: TokenType.ERC20,
        reputation: null,
      };
    }

    return erc20TokenBalances;
  }

  #mapNftList(deBankNftList: DeBankNftToken[]): Record<string, NftTokenWithBalance | Error> {
    return deBankNftList.reduce(
      (accumulator, token) => ({
        ...accumulator,
        [`${token.contract_id}-${token.id}`]: {
          address: token.contract_id,
          description: token.description,
          logoUri: token.thumbnail_url,
          logoSmall: getSmallImageForNFT(token.content),
          name: token.name,
          symbol: '',
          tokenId: `${token.inner_id}`,
          tokenUri: token.detail_url,
          collectionName: token.collection_name,
          balance: BigInt(token.amount),
          balanceDisplayValue: `${token.amount}`,
          type: token.is_erc721 ? TokenType.ERC721 : TokenType.ERC1155,
          metadata: {
            description: token.description,
            properties: '',
          },
        },
      }),
      {} as Record<string, NftTokenWithBalance>,
    );
  }

  async listNftBalances({
    chainId,
    address,
  }: {
    chainId: number;
    address: string;
  }): Promise<Record<string, NftTokenWithBalance | Error>> {
    if (!isHexString(address)) {
      throw rpcErrors.invalidParams('listNftBalances: not valid address');
    }
    const { chainIdString } = await this.#getChainInfo(chainId);

    const nftList = await this.#deBank.getNftList({ chainId: chainIdString, address });
    return this.#mapNftList(nftList);
  }
}
