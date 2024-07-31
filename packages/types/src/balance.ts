import type { Storage, Network } from './common';
import type { NetworkContractToken, NetworkToken, TokenType } from './token';
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
  balance: bigint;
  balanceDisplayValue: string;
  balanceInCurrency?: number;
  balanceCurrencyDisplayValue?: string;
};

export type TokenMarketData = {
  priceInCurrency?: number;
  priceChanges?: {
    percentage?: number;
    value?: number;
  };
  marketCap?: number;
  change24?: number;
  vol24?: number;
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
  unconfirmedBalance?: bigint;
  unconfirmedBalanceDisplayValue?: string;
  unconfirmedBalanceCurrencyDisplayValue?: string;
  unconfirmedBalanceInCurrency?: number;
}

/**
 * Avalanche TokenWithBalance interface.
 */
export interface TokenWithBalancePVM extends NetworkTokenWithBalance {
  available?: bigint;
  availableInCurrency?: number;
  availableDisplayValue?: string;
  availableCurrencyDisplayValue?: string;
  utxos?: PChainBalance;
  balancePerType: {
    lockedStaked: number;
    lockedStakeable: number;
    lockedPlatform: number;
    atomicMemoryLocked: number;
    atomicMemoryUnlocked: number;
    unlockedUnstaked: number;
    unlockedStaked: number;
    pendingStaked: number;
  };
}

export interface TokenWithBalanceAVM extends NetworkTokenWithBalance {
  available?: bigint;
  availableInCurrency?: number;
  availableDisplayValue?: string;
  availableCurrencyDisplayValue?: string;
  utxos?: XChainBalances;
  balancePerType: {
    locked: number;
    unlocked: number;
    atomicMemoryUnlocked: number;
    atomicMemoryLocked: number;
  };
}

export interface NftTokenWithBalance extends Omit<NetworkTokenWithBalance, 'type'> {
  type: TokenType.ERC721 | TokenType.ERC1155;
  address: string;
  description: string;
  logoUri: string;
  logoSmall: string;
  name: string;
  symbol: string;
  tokenId: string;
  attributes: TokenAttribute[];
  collectionName: string;
  updatedAt?: number;
}

export interface TokenAttribute {
  name: string;
  value: string;
}

export type TokenWithBalance =
  | TokenWithBalanceEVM
  | TokenWithBalanceBTC
  | TokenWithBalancePVM
  | TokenWithBalanceAVM
  | NftTokenWithBalance;

export type GetBalancesResponse = Record<string, Record<string, TokenWithBalance>>;
