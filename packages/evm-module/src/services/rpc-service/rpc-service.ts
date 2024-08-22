import { CurrencyCode } from '@avalabs/glacier-sdk';
import type { BalanceServiceInterface, TokenId } from '../../handlers/get-balances/balance-service-interface';
import {
  type ERC20Token,
  type Network,
  type NetworkContractToken,
  type NetworkTokenWithBalance,
  type Storage,
  type Error,
  TokenType,
  type TokenWithBalanceEVM,
} from '@avalabs/vm-module-types';
import { addIdToPromise, settleAllIdPromises } from '../../utils/id-promise';
import type { VsCurrencyType } from '@avalabs/core-coingecko-sdk';
import { TokenUnit } from '@avalabs/core-utils-sdk';
import { ethers } from 'ethers';
import ERC20 from '@openzeppelin/contracts/build/contracts/ERC20.json';
import { getProvider } from '../../utils/get-provider';
import { TokenService } from '@internal/utils';
import { getTokens } from '../../handlers/get-tokens/get-tokens';

export class RpcService implements BalanceServiceInterface {
  #network: Network;
  #storage: Storage | undefined;
  #proxyApiUrl: string;
  #customTokens: NetworkContractToken[];

  constructor({
    network,
    storage,
    proxyApiUrl,
    customTokens,
  }: {
    network: Network;
    storage?: Storage;
    proxyApiUrl: string;
    customTokens: NetworkContractToken[];
  }) {
    this.#network = network;
    this.#storage = storage;
    this.#proxyApiUrl = proxyApiUrl;
    this.#customTokens = customTokens;
  }

  async isNetworkSupported(): Promise<boolean> {
    return true;
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
    const provider = getProvider({
      chainId,
      chainName: this.#network.chainName,
      rpcUrl: this.#network.rpcUrl,
      multiContractAddress: this.#network.utilityAddresses?.multicall,
    });

    const coingeckoTokenId = this.#network.pricingProviders?.coingecko.nativeTokenId;
    const networkToken = this.#network.networkToken;
    const tokenService = new TokenService({ storage: this.#storage, proxyApiUrl: this.#proxyApiUrl });
    const simplePriceResponse = coingeckoTokenId
      ? await tokenService.getSimplePrice({
          coinIds: [coingeckoTokenId],
          currencies: [currency] as unknown as VsCurrencyType[],
        })
      : {};

    const priceInCurrency = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.price ?? undefined;
    const marketCap = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.marketCap ?? undefined;
    const vol24 = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.vol24 ?? undefined;
    const change24 = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.change24 ?? undefined;

    const balance = await provider.getBalance(address);
    const balanceUnit = new TokenUnit(balance, networkToken.decimals, networkToken.symbol);
    const balanceInCurrency = priceInCurrency !== undefined ? balanceUnit.mul(priceInCurrency) : undefined;

    return {
      ...networkToken,
      coingeckoId: coingeckoTokenId ?? '',
      type: TokenType.NATIVE,
      balance,
      balanceDisplayValue: balanceUnit.toDisplay(),
      balanceInCurrency: balanceInCurrency?.toDisplay({ fixedDp: 2, asNumber: true }),
      balanceCurrencyDisplayValue: balanceInCurrency?.toDisplay({ fixedDp: 2 }),
      priceInCurrency,
      marketCap,
      vol24,
      change24,
    };
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
    const provider = getProvider({
      chainId,
      chainName: this.#network.chainName,
      rpcUrl: this.#network.rpcUrl,
      multiContractAddress: this.#network.utilityAddresses?.multicall,
    });

    const coingeckoPlatformId = this.#network.pricingProviders?.coingecko.assetPlatformId;
    const coingeckoTokenId = this.#network.pricingProviders?.coingecko.nativeTokenId;
    const tokens = await getTokens({ chainId: Number(chainId), proxyApiUrl: this.#proxyApiUrl });
    const tokenAddresses = tokens.map((token) => token.address);
    const erc20TokenList = [...tokens, ...this.#customTokens].filter(isERC20Token);

    const getTokenWithBalance = async (token: ERC20Token) => {
      const contract = new ethers.Contract(token.address, ERC20.abi, provider);
      const balanceBig: bigint = await contract.balanceOf?.(address);
      const balance = balanceBig || 0n;

      return {
        ...token,
        balance,
      };
    };

    const tokenBalancePromises = erc20TokenList.map((token) => {
      return addIdToPromise(getTokenWithBalance(token), token.address);
    });
    const tokenBalancesResults = await settleAllIdPromises(tokenBalancePromises);
    const tokenService = new TokenService({ storage: this.#storage, proxyApiUrl: this.#proxyApiUrl });
    const simplePriceResponse =
      (coingeckoPlatformId &&
        (await tokenService.getPricesByAddresses(
          tokenAddresses,
          coingeckoPlatformId,
          currency as unknown as VsCurrencyType,
        ))) ||
      {};

    const tokenIds = Object.keys(tokenBalancesResults);
    const erc20TokenBalances: Record<TokenId, TokenWithBalanceEVM | Error> = {};
    for (let i = 0; i < tokenIds.length; i++) {
      const tokenId = tokenIds[i];
      if (tokenId === undefined) continue;
      const tokenBalance = tokenBalancesResults[tokenId];
      if (tokenBalance === undefined || 'error' in tokenBalance) {
        erc20TokenBalances[tokenId] = {
          error: `rpcService:getTokenWithBalance failed: ${tokenBalance?.error ?? 'unknown error'}`,
        };
        continue;
      }

      const priceInCurrency = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.price ?? undefined;
      const marketCap = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.marketCap ?? undefined;
      const vol24 = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.vol24 ?? undefined;
      const change24 = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.change24 ?? undefined;

      const balance = new TokenUnit(tokenBalance.balance, tokenBalance.decimals, tokenBalance.symbol);
      const balanceInCurrency = priceInCurrency !== undefined ? balance.mul(priceInCurrency) : undefined;

      erc20TokenBalances[tokenBalance.address.toLowerCase()] = {
        ...tokenBalance,
        type: TokenType.ERC20,
        balance: tokenBalance.balance,
        balanceDisplayValue: balance.toDisplay(),
        balanceInCurrency: balanceInCurrency?.toDisplay({ fixedDp: 2, asNumber: true }),
        balanceCurrencyDisplayValue: balanceInCurrency?.toDisplay({ fixedDp: 2 }),
        priceInCurrency,
        marketCap,
        change24,
        vol24,
      };
    }
    return erc20TokenBalances;
  }
}

function isERC20Token(token: NetworkContractToken): token is ERC20Token {
  return token.type === TokenType.ERC20;
}
