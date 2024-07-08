import type { Cache, Network } from './common';
import type { NetworkContractToken, NetworkToken, TokenType } from './token';
import BN from 'bn.js';

export type GetBalancesParams = {
  chainId: string; // caip2ChainId
  addresses: string[]; // addressC of each account
  network: Network;
  customTokens?: NetworkContractToken[];
  currency: string;
  cache?: Cache;
};

export type TokenBalanceData = {
  type: TokenType;
  name: string;
  symbol: string;
  balance: BN;
  balanceInCurrency: number;
  balanceDisplayValue: string;
  balanceCurrencyDisplayValue: string;
  priceInCurrency: number;
  priceChanges?: {
    percentage?: number;
    value?: number;
  };
  utxos?: BitcoinInputUTXOWithOptionalScript[];
};

interface TokenBalanceDataWithDecimals extends TokenBalanceData {
  decimals: number;
}

export type TokenWithBalanceERC20 = TokenBalanceDataWithDecimals &
  TokenMarketData &
  NetworkContractToken & {
    type: TokenType.ERC20;
  };

export type NetworkTokenWithBalance = TokenBalanceDataWithDecimals &
  NetworkToken &
  TokenMarketData & {
    coingeckoId: string;
    type: TokenType.NATIVE;
  };

export type TokenWithBalance = NetworkTokenWithBalance | TokenWithBalanceERC20;

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

type TokenMarketData = {
  marketCap: number;
  change24: number;
  vol24: number;
};

export type GetBalancesResponse = Record<string, Record<string, TokenWithBalance>>;
