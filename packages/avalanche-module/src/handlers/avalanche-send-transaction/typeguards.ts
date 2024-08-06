import {
  TxType,
  type AddPermissionlessDelegatorTx,
  type AddPermissionlessValidatorTx,
  type AddSubnetValidatorTx,
  type BaseTx,
  type BlockchainDetails,
  type ChainDetails,
  type CreateChainTx,
  type CreateSubnetTx,
  type ExportImportTxDetails,
  type ExportTx,
  type ImportTx,
  type RemoveSubnetValidatorTx,
  type StakingDetails,
  type SubnetDetails,
  type TxDetails,
} from '@avalabs/vm-module-types';

export const isAddPermissionlessDelegatorTx = (tx: TxDetails): tx is AddPermissionlessDelegatorTx =>
  tx.type === TxType.AddPermissionlessDelegator;
export const isAddPermissionlessValidatorTx = (tx: TxDetails): tx is AddPermissionlessValidatorTx =>
  tx.type === TxType.AddPermissionlessValidator;
export const isExportTx = (tx: TxDetails): tx is ExportTx => tx.type === TxType.Export;
export const isImportTx = (tx: TxDetails): tx is ImportTx => tx.type === TxType.Import;
export const isBaseTx = (tx: TxDetails): tx is BaseTx => tx.type === TxType.Base;
export const isAddSubnetValidatorTx = (tx: TxDetails): tx is AddSubnetValidatorTx =>
  tx.type === TxType.AddSubnetValidator;
export const isCreateChainTx = (tx: TxDetails): tx is CreateChainTx => tx.type === TxType.CreateChain;
export const isCreateSubnetTx = (tx: TxDetails): tx is CreateSubnetTx => tx.type === TxType.CreateSubnet;
export const isRemoveSubnetValidatorTx = (tx: TxDetails): tx is RemoveSubnetValidatorTx =>
  tx.type === TxType.RemoveSubnetValidator;

export const isStakingDetails = (tx: TxDetails): tx is StakingDetails =>
  isAddPermissionlessDelegatorTx(tx) ||
  isAddPermissionlessValidatorTx(tx) ||
  isAddSubnetValidatorTx(tx) ||
  isRemoveSubnetValidatorTx(tx);
export const isTransactionDetails = (tx: TxDetails): tx is ExportImportTxDetails => isExportTx(tx) || isImportTx(tx);
export const isChainDetails = (tx: TxDetails): tx is ChainDetails => isBaseTx(tx);
export const isBlockchainDetails = (tx: TxDetails): tx is BlockchainDetails => isCreateChainTx(tx);
export const isSubnetDetails = (tx: TxDetails): tx is SubnetDetails => isCreateSubnetTx(tx);
