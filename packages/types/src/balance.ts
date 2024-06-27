import type { TokenUnit } from '@avalabs/utils-sdk';
import type { NetworkContractToken, NetworkToken, TokenType } from './token';
import type { CacheProviderParams, Chain } from './common';

export type GetBalancesParams = Chain &
  CacheProviderParams & {
    chainId: string;
    accountAddress: string;
    networkToken: NetworkToken;
    tokens: NetworkContractToken[];
    currency: string;
    nativeTokenId?: string;
    assetPlatformId?: string;
  };

/**
 * Custom Bitcoin UTXO interface.
 */
interface BitcoinInputUTXO {
  txHash: string;
  txHex?: string;
  index: number;
  value: number;
  script: string;
  blockHeight: number;
  confirmations: number;
  confirmedTime?: string;
}

interface BitcoinInputUTXOWithOptionalScript extends Omit<BitcoinInputUTXO, 'script'> {
  script?: string;
}

export type TokenBalanceData = {
  type: TokenType;
  balance: TokenUnit;
  balanceInCurrency: number;
  balanceDisplayValue: string;
  balanceCurrencyDisplayValue: string;
  priceInCurrency: number;
  utxos?: BitcoinInputUTXOWithOptionalScript[];
};

export interface TokenBalanceDataWithDecimals extends TokenBalanceData {
  decimals: number;
}

export type TokenMarketData = {
  marketCap: number;
  change24: number;
  vol24: number;
};

export type TokenWithBalanceERC20 = TokenBalanceData &
  TokenMarketData &
  NetworkContractToken & {
    type: TokenType.ERC20;
  };

export type NetworkTokenWithBalance = TokenBalanceData &
  TokenMarketData &
  NetworkToken & {
    coingeckoId: string;
    type: TokenType.NATIVE;
  };

export type TokenWithBalance = NetworkTokenWithBalance | TokenWithBalanceERC20;
