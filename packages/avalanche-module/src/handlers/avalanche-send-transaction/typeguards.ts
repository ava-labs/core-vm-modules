import {
  TxType,
  type AddPermissionlessDelegatorTx,
  type AddPermissionlessValidatorTx,
  type AddSubnetValidatorTx,
  type BaseTx,
  type CreateChainTx,
  type CreateSubnetTx,
  type ExportTx,
  type ImportTx,
  type RemoveSubnetValidatorTx,
  type StakingDetails,
} from '@avalabs/vm-module-types';

export const isAddPermissionlessDelegatorTx = (tx: StakingDetails): tx is AddPermissionlessDelegatorTx =>
  tx.type === TxType.AddPermissionlessDelegator;
export const isAddPermissionlessValidatorTx = (tx: StakingDetails): tx is AddPermissionlessValidatorTx =>
  tx.type === TxType.AddPermissionlessValidator;
export const isExportTx = (tx: StakingDetails): tx is ExportTx => tx.type === TxType.Export;
export const isImportTx = (tx: StakingDetails): tx is ImportTx => tx.type === TxType.Import;
export const isBaseTx = (tx: StakingDetails): tx is BaseTx => tx.type === TxType.Base;
export const isAddSubnetValidatorTx = (tx: StakingDetails): tx is AddSubnetValidatorTx =>
  tx.type === TxType.AddSubnetValidator;
export const isCreateChainTx = (tx: StakingDetails): tx is CreateChainTx => tx.type === TxType.CreateChain;
export const isCreateSubnetTx = (tx: StakingDetails): tx is CreateSubnetTx => tx.type === TxType.CreateSubnet;
export const isRemoveSubnetValidatorTx = (tx: StakingDetails): tx is RemoveSubnetValidatorTx =>
  tx.type === TxType.RemoveSubnetValidator;
