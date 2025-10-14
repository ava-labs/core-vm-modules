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
import type { TokenService } from '@internal/utils';

export type TokenId = Hex | string;

export interface BalanceServiceInterface {
  isNetworkSupported(chainId: number): Promise<boolean>;

  getNativeBalance(params: {
    network: Network;
    address: string;
    currency: CurrencyCode;
    tokenService: TokenService;
  }): Promise<NetworkTokenWithBalance>;

  listErc20Balances(params: {
    network: Network;
    address: string;
    currency: CurrencyCode;
    pageSize: number;
    pageToken?: string;
    customTokens: ERC20Token[];
    tokenService: TokenService;
  }): Promise<Record<string, TokenWithBalanceEVM | Error>>;

  listNftBalances(params: { network: Network; address: string }): Promise<Record<string, NftTokenWithBalance | Error>>;
}
