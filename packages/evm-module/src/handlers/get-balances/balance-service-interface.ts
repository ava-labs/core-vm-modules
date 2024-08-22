import { CurrencyCode } from '@avalabs/glacier-sdk';
import type { ERC20Token, Error, Hex, NetworkTokenWithBalance, TokenWithBalanceEVM } from '@avalabs/vm-module-types';

export type TokenId = Hex | string;

export interface BalanceServiceInterface {
  isNetworkSupported(chainId: number): Promise<boolean>;

  getNativeBalance({
    chainId,
    address,
    currency,
    coingeckoId,
  }: {
    chainId: number;
    address: string;
    currency: CurrencyCode;
    coingeckoId?: string;
  }): Promise<NetworkTokenWithBalance>;

  listErc20Balances({
    chainId,
    address,
    currency,
    customTokens,
  }: {
    chainId: number;
    address: string;
    currency: CurrencyCode;
    pageSize: number;
    pageToken?: string;
    customTokens: ERC20Token[];
  }): Promise<Record<string, TokenWithBalanceEVM | Error>>;
}
