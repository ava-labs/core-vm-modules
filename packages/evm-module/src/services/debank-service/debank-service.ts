import { CurrencyCode } from '@avalabs/glacier-sdk';
import type { BalanceServiceInterface, TokenId } from '@src/handlers/get-balances/balance-service-interface';
import { TokenUnit } from '@avalabs/core-utils-sdk';
import { isHexString } from 'ethers';
import {
  type Error,
  type Network,
  type NetworkTokenWithBalance,
  type NftTokenWithBalance,
  TokenType,
  type TokenWithBalanceEVM,
} from '@avalabs/vm-module-types';
import { DeBank, type DeBankChainInfo, type DeBankNftToken } from './de-bank';
import { rpcErrors } from '@metamask/rpc-errors';
import {
  extractTokenMarketData,
  fetchContractTokensMarketData,
  getNativeTokenMarketData,
  TokenService,
} from '@internal/utils';
import { getSmallImageForNFT } from '../../utils/get-small-image-for-nft';
import type { VsCurrencyType } from '@avalabs/core-coingecko-sdk';

export class DeBankService implements BalanceServiceInterface {
  #deBank: DeBank;
  #tokenService: TokenService;

  constructor({ proxyApiUrl, tokenService }: { proxyApiUrl: string; tokenService: TokenService }) {
    this.#deBank = new DeBank(`${proxyApiUrl}/proxy/debank`);
    this.#tokenService = tokenService;
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
    network,
    address,
    currency,
  }: {
    network: Network;
    address: string;
    currency: CurrencyCode;
  }): Promise<NetworkTokenWithBalance> {
    if (!isHexString(address)) throw rpcErrors.invalidParams('getNativeBalance: not valid address: ' + address);
    const { chainInfo, chainIdString } = await this.#getChainInfo(network.chainId);

    const nativeTokenBalance = await this.#deBank.getTokenBalance({
      address,
      chainId: chainIdString,
      tokenId: chainInfo.native_token_id,
    });
    const tokenUnit = new TokenUnit(
      nativeTokenBalance.raw_amount,
      nativeTokenBalance.decimals,
      nativeTokenBalance.symbol,
    );
    const balanceDisplayValue = tokenUnit.toDisplay();
    const { priceInCurrency, marketCap, vol24, change24, tokenId } = await getNativeTokenMarketData({
      network,
      tokenService: this.#tokenService,
      currency: currency.toLowerCase() as VsCurrencyType,
    });

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
      marketCap,
      vol24,
      change24,
      coingeckoId: tokenId ?? '',
    };
  }

  async listErc20Balances({
    network,
    address,
    currency,
  }: {
    network: Network;
    address: string;
    currency: CurrencyCode;
  }): Promise<Record<TokenId, TokenWithBalanceEVM | Error>> {
    if (!isHexString(address)) throw rpcErrors.invalidParams('listErc20Balances: not valid address');
    const { chainInfo, chainIdString } = await this.#getChainInfo(network.chainId);
    const tokenBalances = await this.#deBank.getTokensBalanceOnChain({ chainId: chainIdString, address });
    // skip native token or tokens which are not core tokens
    const filteredTokenBalances = tokenBalances.filter(
      (token) => token.id !== chainInfo.native_token_id && token.is_core === true,
    );

    const erc20TokenBalances: Record<TokenId, TokenWithBalanceEVM | Error> = {};
    const lowercaseCurrency = currency.toLowerCase() as unknown as VsCurrencyType;
    const simplePriceResponse = await fetchContractTokensMarketData({
      tokenAddresses: filteredTokenBalances.map((token) => token.id.toLowerCase()),
      network,
      tokenService: this.#tokenService,
      currency: lowercaseCurrency,
    });
    for (const tokenBalance of filteredTokenBalances) {
      const tokenUnit = new TokenUnit(tokenBalance.raw_amount, tokenBalance.decimals, tokenBalance.symbol);
      const balanceDisplayValue = tokenUnit.toDisplay();

      const { priceInCurrency, marketCap, vol24, change24 } = extractTokenMarketData(
        tokenBalance.id.toLowerCase() ?? '',
        lowercaseCurrency,
        simplePriceResponse,
      );
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
        marketCap,
        vol24,
        change24,
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
          description: token.description ?? '',
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
            description: token.description ?? '',
            properties: '',
          },
        },
      }),
      {} as Record<string, NftTokenWithBalance>,
    );
  }

  async listNftBalances({
    network,
    address,
  }: {
    network: Network;
    address: string;
  }): Promise<Record<string, NftTokenWithBalance | Error>> {
    if (!isHexString(address)) {
      throw rpcErrors.invalidParams('listNftBalances: not valid address');
    }
    const chainId = network.chainId;
    const { chainIdString } = await this.#getChainInfo(chainId);

    const nftList = await this.#deBank.getNftList({ chainId: chainIdString, address });
    return this.#mapNftList(nftList);
  }
}
