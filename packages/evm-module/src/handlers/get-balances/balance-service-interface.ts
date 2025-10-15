import { CurrencyCode } from '@avalabs/glacier-sdk';
import type {
  ERC20Token,
  Error,
  Hex,
  Network,
  NetworkTokenWithBalance,
  NftTokenWithBalance,
  TokenWithBalanceEVM,
} from '@avalabs/vm-module-types';

export type TokenId = Hex | string;

export interface BalanceServiceInterface {
  isNetworkSupported(chainId: number): Promise<boolean>;

  getNativeBalance(params: {
    network: Network;
    address: string;
    currency: CurrencyCode;
  }): Promise<NetworkTokenWithBalance>;

  listErc20Balances(params: {
    network: Network;
    address: string;
    currency: CurrencyCode;
    customTokens: ERC20Token[];
  }): Promise<Record<string, TokenWithBalanceEVM | Error>>;

  listNftBalances(params: { network: Network; address: string }): Promise<Record<string, NftTokenWithBalance | Error>>;
}
