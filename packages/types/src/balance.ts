import type { Storage, Network } from './common';
import type { NetworkContractToken, NetworkToken, TokenType } from './token';
import type BN from 'bn.js';
import type { PChainBalance, XChainBalances } from '@avalabs/glacier-sdk';

export type GetBalancesParams = {
  addresses: string[];
  network: Network;
  customTokens?: NetworkContractToken[];
  currency: string;
  storage?: Storage;
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
};

type TokenMarketData = {
  marketCap: number;
  change24: number;
  vol24: number;
};

export type NetworkTokenWithBalance = TokenBalanceDataWithDecimals &
  NetworkToken &
  TokenMarketData & {
    coingeckoId: string;
    type: TokenType.NATIVE;
  };

interface TokenBalanceDataWithDecimals extends TokenBalanceData {
  decimals: number;
}

/**
 * EVM TokenWithBalance interface.
 */
export type TokenWithBalanceERC20 = TokenBalanceDataWithDecimals &
  TokenMarketData &
  NetworkContractToken & {
    type: TokenType.ERC20;
  };

export type TokenWithBalanceEVM = NetworkTokenWithBalance | TokenWithBalanceERC20;

/**
 * Bitcoin TokenWithBalance interface.
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

export interface TokenWithBalanceBTC extends NetworkTokenWithBalance {
  logoUri: string;
  utxos: BitcoinInputUTXOWithOptionalScript[];
  utxosUnconfirmed?: BitcoinInputUTXOWithOptionalScript[];
  unconfirmedBalance?: BN;
  unconfirmedBalanceDisplayValue?: string;
  unconfirmedBalanceCurrencyDisplayValue?: string;
  unconfirmedBalanceInCurrency?: number;
}

/**
 * Avalanche TokenWithBalance interface.
 */
export interface TokenWithBalancePVM extends NetworkTokenWithBalance {
  available?: BN;
  availableInCurrency?: number;
  availableDisplayValue?: string;
  availableCurrencyDisplayValue?: string;
  utxos?: PChainBalance;
  lockedStaked: number;
  lockedStakeable: number;
  lockedPlatform: number;
  atomicMemoryLocked: number;
  atomicMemoryUnlocked: number;
  unlockedUnstaked: number;
  unlockedStaked: number;
  pendingStaked: number;
}

export interface TokenWithBalanceAVM extends NetworkTokenWithBalance {
  available?: BN;
  availableInCurrency?: number;
  availableDisplayValue?: string;
  availableCurrencyDisplayValue?: string;
  utxos?: XChainBalances;
  locked: number;
  unlocked: number;
  atomicMemoryUnlocked: number;
  atomicMemoryLocked: number;
}

export type TokenWithBalance = TokenWithBalanceEVM | TokenWithBalanceBTC | TokenWithBalancePVM | TokenWithBalanceAVM;

export type GetBalancesResponse = Record<string, Record<string, TokenWithBalance>>;
