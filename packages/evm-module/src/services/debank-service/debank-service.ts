import { CurrencyCode } from '@avalabs/glacier-sdk';
import type { BalanceServiceInterface, TokenId } from '../../handlers/get-balances/balance-service-interface';
import { TokenUnit } from '@avalabs/core-utils-sdk';
import { isHexString } from 'ethers';
import {
  type NetworkTokenWithBalance,
  TokenType,
  type TokenWithBalanceEVM,
  type Error,
} from '@avalabs/vm-module-types';
import { DeBank } from './de-bank';
import { rpcErrors } from '@metamask/rpc-errors';
import { getExchangeRates } from '@internal/utils';
import { addIdToPromise, settleAllIdPromises } from '../../utils/id-promise';

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
    const tokenList = await this.#deBank.getTokenList({ chainId: chainIdString, address });
    const chainInfo = await this.#deBank.getChainInfo({ chainId: chainIdString });
    if (!chainInfo) throw rpcErrors.invalidParams('getNativeBalance: not valid chainId: ' + chainId);
    const erc20TokenList = tokenList.filter((token) => token.id !== chainInfo.native_token_id);

    const tokenBalancePromises = erc20TokenList.map((token) => {
      return addIdToPromise(
        this.#deBank.getTokenBalance({ chainId: chainIdString, tokenId: token.id, address }),
        token.id,
      );
    });

    const tokenBalancesResults = await settleAllIdPromises(tokenBalancePromises);

    const tokenIds = Object.keys(tokenBalancesResults);
    const erc20TokenBalances: Record<TokenId, TokenWithBalanceEVM | Error> = {};
    for (let i = 0; i < tokenIds.length; i++) {
      const tokenId = tokenIds[i];
      if (tokenId === undefined) continue;
      const tokenBalance = tokenBalancesResults[tokenId];
      if (tokenBalance === undefined || 'error' in tokenBalance) {
        erc20TokenBalances[tokenId] = {
          error: `deBank:getTokenBalance failed: ${tokenBalance?.error ?? 'unknown error'}`,
        };
        continue;
      }

      const tokenUnit = new TokenUnit(tokenBalance.raw_amount, tokenBalance.decimals, tokenBalance.symbol);
      const balanceDisplayValue = tokenUnit.toDisplay();
      const exchangeRates = await getExchangeRates();
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
      };
    }

    return erc20TokenBalances;
  }
}
