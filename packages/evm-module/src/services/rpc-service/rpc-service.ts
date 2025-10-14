import { CurrencyCode } from '@avalabs/glacier-sdk';
import type { BalanceServiceInterface, TokenId } from '../../handlers/get-balances/balance-service-interface';
import {
  type ERC20Token,
  type Network,
  type NetworkContractToken,
  type NetworkTokenWithBalance,
  type Error,
  TokenType,
  type TokenWithBalanceEVM,
  type NftTokenWithBalance,
} from '@avalabs/vm-module-types';
import { addIdToPromise, settleAllIdPromises } from '../../utils/id-promise';
import type { VsCurrencyType } from '@avalabs/core-coingecko-sdk';
import { TokenUnit } from '@avalabs/core-utils-sdk';
import { ethers } from 'ethers';
import ERC20 from '@openzeppelin/contracts/build/contracts/ERC20.json';
import { getProvider } from '../../utils/get-provider';
import { getTokens } from '../../handlers/get-tokens/get-tokens';
import { isERC20Token } from '../../utils/type-utils';
import {
  extractTokenMarketData,
  fetchContractTokensMarketData,
  getNativeTokenMarketData,
  type TokenService,
} from '@internal/utils';

export class RpcService implements BalanceServiceInterface {
  #network: Network;
  #tokenService: TokenService;
  #proxyApiUrl: string;
  #customTokens: NetworkContractToken[];

  constructor({
    network,
    tokenService,
    proxyApiUrl,
    customTokens,
  }: {
    network: Network;
    tokenService: TokenService;
    proxyApiUrl: string;
    customTokens: NetworkContractToken[];
  }) {
    this.#network = network;
    this.#tokenService = tokenService;
    this.#proxyApiUrl = proxyApiUrl;
    this.#customTokens = customTokens;
  }

  async isNetworkSupported(): Promise<boolean> {
    return true;
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
    const provider = await getProvider({
      chainId: network.chainId,
      chainName: this.#network.chainName,
      rpcUrl: this.#network.rpcUrl,
      multiContractAddress: this.#network.utilityAddresses?.multicall,
    });

    const networkToken = this.#network.networkToken;

    const { priceInCurrency, marketCap, vol24, change24, tokenId } = await getNativeTokenMarketData({
      network,
      tokenService: this.#tokenService,
      currency: currency.toLowerCase() as VsCurrencyType,
    });

    const balance = await provider.getBalance(address);
    const balanceUnit = new TokenUnit(balance, networkToken.decimals, networkToken.symbol);
    const balanceInCurrency = priceInCurrency !== undefined ? balanceUnit.mul(priceInCurrency) : undefined;

    return {
      ...networkToken,
      coingeckoId: tokenId ?? '',
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
    network,
    address,
    currency,
  }: {
    network: Network;
    address: string;
    currency: CurrencyCode;
  }): Promise<Record<TokenId, TokenWithBalanceEVM | Error>> {
    const provider = await getProvider({
      chainId: network.chainId,
      chainName: this.#network.chainName,
      rpcUrl: this.#network.rpcUrl,
      multiContractAddress: this.#network.utilityAddresses?.multicall,
    });

    const tokens = await getTokens({ chainId: Number(network.chainId), proxyApiUrl: this.#proxyApiUrl });
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
    const simplePriceResponse = await fetchContractTokensMarketData({
      tokenAddresses,
      network,
      tokenService: this.#tokenService,
      currency: currency as unknown as VsCurrencyType,
    });

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

      const { priceInCurrency, marketCap, vol24, change24 } = extractTokenMarketData(
        tokenBalance.address,
        currency as unknown as VsCurrencyType,
        simplePriceResponse,
      );

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
        reputation: null,
      };
    }
    return erc20TokenBalances;
  }

  async listNftBalances(): Promise<Record<string, NftTokenWithBalance | Error>> {
    // the token list does not maintain a list of NFTs
    return {};
  }
}
