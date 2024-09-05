import { CurrencyCode } from '@avalabs/glacier-sdk';
import type {
  ERC20Token,
  Error,
  Hex,
  NetworkTokenWithBalance,
  NftTokenWithBalance,
  TokenWithBalanceEVM,
} from '@avalabs/vm-module-types';

export type TokenId = Hex | string;

export interface BalanceServiceInterface {
  isNetworkSupported(chainId: number): Promise<boolean>;

  getNativeBalance(params: {
    chainId: number;
    address: string;
    currency: CurrencyCode;
    coingeckoId?: string;
  }): Promise<NetworkTokenWithBalance>;

  listErc20Balances(params: {
    chainId: number;
    address: string;
    currency: CurrencyCode;
    pageSize: number;
    pageToken?: string;
    customTokens: ERC20Token[];
  }): Promise<Record<string, TokenWithBalanceEVM | Error>>;

  listNftBalances(params: { chainId: number; address: string }): Promise<Record<string, NftTokenWithBalance | Error>>;
}
