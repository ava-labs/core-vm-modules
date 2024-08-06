import type { NetworkVMType } from './common';

export type StakingDetails =
  | AddPermissionlessDelegatorTx
  | AddPermissionlessValidatorTx
  | ExportTx
  | ImportTx
  | BaseTx
  | AddSubnetValidatorTx
  | CreateChainTx
  | CreateSubnetTx
  | RemoveSubnetValidatorTx;

export type VM = NetworkVMType.AVM | NetworkVMType.EVM | NetworkVMType.PVM;

export type AddPermissionlessDelegatorTx = {
  type: TxType.AddPermissionlessDelegator;
  nodeID: string;
  subnetID: string;
  stake: bigint;
  start: string;
  end: string;
  txFee: bigint;
};

export type AddPermissionlessValidatorTx = {
  type: TxType.AddPermissionlessValidator;
  nodeID: string;
  subnetID: string;
  stake: bigint;
  delegationFee: number;
  start: string;
  end: string;
  txFee: bigint;
  publicKey?: string;
  signature?: string;
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
  Unknown = 'unknown',
}
