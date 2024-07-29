import type { Network } from './common';
import type { TokenType } from './token';

export type GetTransactionHistory = {
  network: Network;
  address: string;
  nextPageToken?: string;
  offset?: number;
};

export type TransactionHistoryResponse = {
  transactions: Transaction[];
  nextPageToken?: string;
};

export type Transaction = {
  isContractCall: boolean;
  isIncoming: boolean;
  isOutgoing: boolean;
  isSender: boolean;
  timestamp: number;
  hash: string;
  from: string;
  to: string;
  tokens: TxToken[];
  gasPrice?: string;
  gasUsed: string;
  txType?: TransactionType | PChainTransactionType | XChainTransactionType | 'CreateAssetTx' | 'OperationTx';
  chainId: string; // chainId from ActiveNetwork used to fetch tx
  method?: string;
  explorerLink: string;
};

export interface TxToken {
  decimal?: string;
  name: string;
  symbol: string;
  amount: string;
  imageUri?: string;
  from?: TokenWithAddress;
  to?: TokenWithAddress;
  collectableTokenId?: string;
  type: TokenType;
}

// this is RichAddress from @avalabs/glacier-sdk,
// rename it to TokenWithAddress for better understanding
type TokenWithAddress = {
  /**
   * The contract name.
   */
  name?: string;
  /**
   * The contract symbol.
   */
  symbol?: string;
  /**
   * The number of decimals the token uses. For example `6`, means to divide the token amount by `1000000` to get its user representation.
   */
  decimals?: number;
  /**
   * The logo uri for the address.
   */
  logoUri?: string;
  /**
   * A wallet or contract address in mixed-case checksum encoding.
   */
  address: string;
};

export enum TransactionType {
  BRIDGE = 'Bridge',
  SWAP = 'Swap',
  SEND = 'Send',
  RECEIVE = 'Receive',
  NFT_BUY = 'NFTBuy',
  APPROVE = 'Approve',
  TRANSFER = 'Transfer',
  NFT_SEND = 'NFTSend',
  NFT_RECEIVE = 'NFTReceive',
  AIRDROP = 'Airdrop',
  FILL_ORDER = 'FillOrder',
  UNWRAP = 'Unwrap',
  UNKNOWN = 'UNKNOWN',
}

export enum PChainTransactionType {
  ADD_VALIDATOR_TX = 'AddValidatorTx',
  ADD_SUBNET_VALIDATOR_TX = 'AddSubnetValidatorTx',
  ADD_DELEGATOR_TX = 'AddDelegatorTx',
  CREATE_CHAIN_TX = 'CreateChainTx',
  CREATE_SUBNET_TX = 'CreateSubnetTx',
  IMPORT_TX = 'ImportTx',
  EXPORT_TX = 'ExportTx',
  ADVANCE_TIME_TX = 'AdvanceTimeTx',
  REWARD_VALIDATOR_TX = 'RewardValidatorTx',
  REMOVE_SUBNET_VALIDATOR_TX = 'RemoveSubnetValidatorTx',
  TRANSFORM_SUBNET_TX = 'TransformSubnetTx',
  ADD_PERMISSIONLESS_VALIDATOR_TX = 'AddPermissionlessValidatorTx',
  ADD_PERMISSIONLESS_DELEGATOR_TX = 'AddPermissionlessDelegatorTx',
  BASE_TX = 'BaseTx',
  TRANSFER_SUBNET_OWNERSHIP_TX = 'TransferSubnetOwnershipTx',
  UNKNOWN = 'UNKNOWN',
}

export enum XChainTransactionType {
  BASE_TX = 'BaseTx',
  CREATE_ASSET_TX = 'CreateAssetTx',
  OPERATION_TX = 'OperationTx',
  IMPORT_TX = 'ImportTx',
  EXPORT_TX = 'ExportTx',
  UNKNOWN = 'UNKNOWN',
}
