import { CurrencyCode } from '@avalabs/glacier-sdk';
import type { BalanceServiceInterface } from '../../handlers/get-balances/balance-service-interface';
import { TokenUnit } from '@avalabs/core-utils-sdk';
import { isHexString } from 'ethers';
import { type NetworkTokenWithBalance, TokenType, type TokenWithBalanceEVM } from '@avalabs/vm-module-types';
import { DE_BANK_SUPPORTED_CHAINS, DeBank, type DeBankToken, type TokenId } from './de-bank';

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
    if (!isHexString(address)) throw Error('getNativeBalance: not valid address: ' + address);
    const chainIdString = DE_BANK_SUPPORTED_CHAINS[chainId];
    if (!chainIdString) throw Error('getNativeBalance: not valid chainId: ' + chainId);
    const chainInfo = await this.#deBank.getChainInfo({ chainId: chainIdString });
    const tokenId = chainInfo.wrapped_token_id;
    const nativeTokenBalance = await this.#deBank.getTokenBalance({ address, chainId: chainIdString, tokenId });
    const tokenUnit = new TokenUnit(
      nativeTokenBalance.raw_amount,
      nativeTokenBalance.decimals,
      nativeTokenBalance.symbol,
    );
    const balanceDisplayValue = tokenUnit.toDisplay();
    const priceInCurrency = currency === CurrencyCode.USD ? nativeTokenBalance.price : undefined;
    const balanceCurrencyDisplayValue = priceInCurrency ? tokenUnit.mul(priceInCurrency).toDisplay(2) : undefined;
    const balanceInCurrency = balanceCurrencyDisplayValue
      ? Number(balanceCurrencyDisplayValue.replaceAll(',', ''))
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
  }): Promise<Record<TokenId, TokenWithBalanceEVM>> {
    if (!isHexString(address)) throw Error('listErc20Balances: not valid address');
    const chainIdString = DE_BANK_SUPPORTED_CHAINS[chainId];
    if (!chainIdString) throw Error('getNativeBalance: not valid chainId: ' + chainId);
    const tokenList = await this.#deBank.getTokenList({ chainId: chainIdString, address });
    const chainInfo = await this.#deBank.getChainInfo({ chainId: chainIdString });
    const erc20TokenList = tokenList.filter((token) => token.id !== chainInfo.native_token_id);

    const tokenBalancePromises = erc20TokenList.map((token) => {
      return this.#deBank
        .getTokenBalance({ chainId: chainIdString, tokenId: token.id, address })
        .then((value) => ({ id: token.id, status: 'fulfilled', value }))
        .catch((reason) => ({ id: token.id, status: 'rejected', reason }));
    });

    let tokenBalancesResults: Record<TokenId, DeBankToken> = {};
    await Promise.allSettled(tokenBalancePromises).then((results) => {
      tokenBalancesResults = results.reduce(
        (acc, result) => {
          if (result.status === 'fulfilled' && 'value' in result.value) {
            acc[result.value.id] = result.value.value;
          }
          return acc;
        },
        {} as Record<TokenId, DeBankToken>,
      );
    });

    const tokenIds = Object.keys(tokenBalancesResults);
    const erc20TokenBalances: Record<TokenId, TokenWithBalanceEVM> = {};
    for (let i = 0; i < tokenIds.length; i++) {
      const tokenId = tokenIds[i];
      if (tokenId === undefined || !isHexString(tokenId)) continue;
      const tokenBalance = tokenBalancesResults[tokenId];
      if (tokenBalance === undefined) continue;

      const tokenUnit = new TokenUnit(tokenBalance.raw_amount, tokenBalance.decimals, tokenBalance.symbol);
      const balanceDisplayValue = tokenUnit.toDisplay();
      const priceInCurrency = currency === CurrencyCode.USD ? tokenBalance.price : undefined;
      const balanceCurrencyDisplayValue = priceInCurrency ? tokenUnit.mul(priceInCurrency).toDisplay(2) : undefined;
      const balanceInCurrency = balanceCurrencyDisplayValue
        ? Number(balanceCurrencyDisplayValue.replaceAll(',', ''))
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
