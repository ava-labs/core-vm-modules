import type { Storage, Network } from './common';
import type { Error } from './error';
import type { NetworkContractToken, NetworkToken, TokenType } from './token';
import type { Erc20TokenBalance, PChainBalance, XChainBalances } from '@avalabs/glacier-sdk';

export type GetBalancesParams = {
  addresses: string[];
  network: Network;
  tokenTypes?: TokenType[];
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
    reputation: Erc20TokenBalance.tokenReputation | null;
  };

/**
 * SPL TokenWithBalance interface.
 */
export type TokenWithBalanceSPL = TokenBalanceDataWithDecimals &
  TokenMarketData & {
    address: string; // mint address
    type: TokenType.SPL;
    logoUri?: string;
    reputation: null;
  };

export type TokenWithBalanceEVM = NetworkTokenWithBalance | TokenWithBalanceERC20 | NftTokenWithBalance;

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

export interface TokenWithBalanceSVM extends NetworkTokenWithBalance {
  logoUri: string;
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
  /**
   * All values are represented in `nAvax`
   */
  balancePerType: {
    lockedStaked?: bigint;
    lockedStakeable?: bigint;
    lockedPlatform?: bigint;
    atomicMemoryLocked?: bigint;
    atomicMemoryUnlocked?: bigint;
    unlockedUnstaked?: bigint;
    unlockedStaked?: bigint;
    pendingStaked?: bigint;
  };
}

export interface TokenWithBalanceAVM extends NetworkTokenWithBalance {
  available?: bigint;
  availableInCurrency?: number;
  availableDisplayValue?: string;
  availableCurrencyDisplayValue?: string;
  utxos?: XChainBalances;
  /**
   * All values are represented in `nAvax`
   */
  balancePerType: {
    locked?: bigint;
    unlocked?: bigint;
    atomicMemoryUnlocked?: bigint;
    atomicMemoryLocked?: bigint;
  };
}

export interface NftTokenWithBalance extends Omit<NetworkTokenWithBalance, 'type' | 'decimals' | 'coingeckoId'> {
  type: TokenType.ERC721 | TokenType.ERC1155;
  address: string;
  description: string;
  logoUri: string;
  logoSmall: string;
  name: string;
  symbol: string;
  tokenId: string;
  // URL holding the metadata of the NFT, modules are not expected to fetch all metadata
  // to avoid increased loading times when dealing with ipfs and 3rd party services
  tokenUri: string;
  collectionName: string;
  updatedAt?: number;
  metadata?: {
    description?: string;
    lastUpdatedTimestamp?: number;
    properties?: string;
  };
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
  | TokenWithBalanceSVM
  | TokenWithBalanceSPL;

export type GetBalancesResponse = Record<string, Record<string, TokenWithBalance | Error> | Error>;
