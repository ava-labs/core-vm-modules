import { CurrencyCode } from '@avalabs/glacier-sdk';
import type { BalanceServiceInterface, TokenId } from '../../handlers/get-balances/balance-service-interface';
import { TokenUnit } from '@avalabs/core-utils-sdk';
import { isHexString } from 'ethers';
import {
  type NetworkTokenWithBalance,
  TokenType,
  type TokenWithBalanceEVM,
  type Error,
  type NftTokenWithBalance,
} from '@avalabs/vm-module-types';
import { DeBank } from './de-bank';
import { rpcErrors } from '@metamask/rpc-errors';
import { getExchangeRates } from '@internal/utils';

export class DeBankService implements BalanceServiceInterface {
  #deBank: DeBank;

  constructor({ proxyApiUrl }: { proxyApiUrl: string }) {
    this.#deBank = new DeBank(`${proxyApiUrl}/proxy/debank`);
  }

  async isNetworkSupported(chainId: number): Promise<boolean> {
    return this.#deBank.isNetworkSupported(chainId);
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
    const chainList = await this.#deBank.getChainList();
    const chainIdString = chainList.find((value) => value.community_id === chainId)?.id;
    if (!chainIdString) throw rpcErrors.invalidParams('getNativeBalance: not valid chainId: ' + chainId);
    const chainInfo = await this.#deBank.getChainInfo({ chainId: chainIdString });
    if (!chainInfo) throw rpcErrors.invalidParams('getNativeBalance: not valid chainId: ' + chainId);
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
    const chainList = await this.#deBank.getChainList();
    const chainIdString = chainList.find((value) => value.community_id === chainId)?.id;
    if (!chainIdString) throw rpcErrors.invalidParams('getNativeBalance: not valid chainId: ' + chainId);
    const chainInfo = await this.#deBank.getChainInfo({ chainId: chainIdString });
    if (!chainInfo) throw rpcErrors.invalidParams('getNativeBalance: not valid chainId: ' + chainId);

    const tokenBalances = await this.#deBank.getTokensBalanceOnChain({ chainId: chainIdString, address });

    const erc20TokenBalances: Record<TokenId, TokenWithBalanceEVM | Error> = {};
    const exchangeRates = await getExchangeRates();

    for (const tokenBalance of tokenBalances) {
      //skip native token
      if (tokenBalance.id === chainInfo.native_token_id) {
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

  async listNftBalances(): Promise<Record<string, NftTokenWithBalance | Error>> {
    // we are not supporting NFTs on debank powered chains
    return {};
  }
}
