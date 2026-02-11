import type { Network, NetworkVMType } from './common';

export type TxDetails =
  | StakingDetails
  | ExportImportTxDetails
  | ChainDetails
  | BlockchainDetails
  | SubnetDetails
  | L1Details;

export type StakingDetails =
  | AddPermissionlessDelegatorTx
  | AddPermissionlessValidatorTx
  | AddSubnetValidatorTx
  | RemoveSubnetValidatorTx;
export type ExportImportTxDetails = ExportTx | ImportTx;
export type ChainDetails = BaseTx;
export type BlockchainDetails = CreateChainTx;
export type SubnetDetails = CreateSubnetTx;
export type L1Details =
  | ConvertSubnetToL1Tx
  | RegisterL1ValidatorTx
  | SetL1ValidatorWeightTx
  | IncreaseL1ValidatorBalanceTx
  | DisableL1ValidatorTx;

export type VM = NetworkVMType.AVM | NetworkVMType.EVM | NetworkVMType.PVM;

export type AddPermissionlessDelegatorTx = {
  type: TxType.AddPermissionlessDelegator;
  nodeID: string;
  stake: bigint;
  start: string;
  end: string;
  txFee: bigint;
  account: string;
  network: Network;
};

export type AddPermissionlessValidatorTx = {
  type: TxType.AddPermissionlessValidator;
  nodeID: string;
  stake: bigint;
  delegationFee: number;
  start: string;
  end: string;
  txFee: bigint;
  account: string;
  network: Network;
};

export interface ExportTx {
  type: TxType.Export;
  destination: VM;
  amount: bigint;
  chain: VM;
  txFee: bigint;
}

export interface ImportTx {
  type: TxType.Import;
  source: VM;
  amount: bigint;
  chain: VM;
  txFee: bigint;
}

export interface BaseTx {
  type: TxType.Base;
  chain: VM;
  outputs: {
    assetId: string;
    locktime: bigint;
    threshold: bigint;
    amount: bigint;
    assetDescription?: {
      assetID: string;
      name: string;
      symbol: string;
      denomination: number;
    };
    owners: string[];
    isAvax: boolean;
  }[];
  memo?: string;
  txFee: bigint;
}

export type AddSubnetValidatorTx = {
  type: TxType.AddSubnetValidator;
  nodeID: string;
  subnetID: string;
  stake: bigint;
  start: string;
  end: string;
  txFee: bigint;
};

export type CreateChainTx = {
  type: TxType.CreateChain;
  chainName: string;
  chainID: string;
  vmID: string;
  genesisData: string;
  txFee: bigint;
};

export type CreateSubnetTx = {
  type: TxType.CreateSubnet;
  threshold: number;
  controlKeys: string[];
  txFee: bigint;
};

export type RemoveSubnetValidatorTx = {
  type: TxType.RemoveSubnetValidator;
  nodeID: string;
  subnetID: string;
  txFee: bigint;
};

export type FeeData = {
  totalAvaxBurned: bigint;
  totalAvaxOutput: bigint;
  totalAvaxInput: bigint;
  isValidAvaxBurnedAmount: boolean;
  txFee: bigint;
};

export type TxBase = FeeData & {
  chain: VM;
};

export type ConvertSubnetToL1Tx = TxBase & {
  type: TxType.ConvertSubnetToL1;
  managerAddress: string;
  validators: {
    nodeId: string;
    stake: bigint;
    balance: bigint;
    remainingBalanceOwners: string[];
    deactivationOwners: string[];
  }[];
  subnetID: string;
  chainID: string;
};

export type RegisterL1ValidatorTx = TxBase & {
  type: TxType.RegisterL1Validator;
  balance: bigint;
};

export type SetL1ValidatorWeightTx = TxBase & {
  type: TxType.SetL1ValidatorWeight;
};

export type IncreaseL1ValidatorBalanceTx = TxBase & {
  type: TxType.IncreaseL1ValidatorBalance;
  balance: bigint;
  validationId: string;
};

export type DisableL1ValidatorTx = TxBase & {
  type: TxType.DisableL1Validator;
  validationId: string;
};

export enum TxType {
  Base = 'base',
  AddValidator = 'add_validator',
  AddDelegator = 'add_delegator',
  Export = 'export',
  Import = 'import',
  CreateSubnet = 'create_subnet',
  CreateChain = 'create_chain',
  AddSubnetValidator = 'add_subnet_validator',
  RemoveSubnetValidator = 'remove_subnet_validator',
  AddPermissionlessValidator = 'add_permissionless_validator',
  AddPermissionlessDelegator = 'add_permissionless_delegator',
  TransformSubnet = 'transform_subnet',
  TransferSubnetOwnership = 'transfer_subnet_ownership',
  ConvertSubnetToL1 = 'convert_subnet_to_l1',
  RegisterL1Validator = 'register_l1_validator',
  SetL1ValidatorWeight = 'set_l1_validator_weight',
  IncreaseL1ValidatorBalance = 'increase_l1_validator_balance',
  DisableL1Validator = 'disable_l1_validator',
  Unknown = 'unknown',
}
