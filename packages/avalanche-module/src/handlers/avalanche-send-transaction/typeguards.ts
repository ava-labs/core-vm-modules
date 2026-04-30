import {
  TxType,
  type AddAutoRenewedValidatorTx,
  type AddPermissionlessDelegatorTx,
  type AddPermissionlessValidatorTx,
  type AddSubnetValidatorTx,
  type BaseTx,
  type BlockchainDetails,
  type ChainDetails,
  type ConvertSubnetToL1Tx,
  type CreateChainTx,
  type CreateSubnetTx,
  type DisableL1ValidatorTx,
  type ExportImportTxDetails,
  type ExportTx,
  type ImportTx,
  type IncreaseL1ValidatorBalanceTx,
  type RegisterL1ValidatorTx,
  type RemoveSubnetValidatorTx,
  type SetAutoRenewedValidatorConfigTx,
  type SetL1ValidatorWeightTx,
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
export const isConvertSubnetToL1Tx = (tx: TxDetails): tx is ConvertSubnetToL1Tx => tx.type === TxType.ConvertSubnetToL1;
export const isDisableL1ValidatorTx = (tx: TxDetails): tx is DisableL1ValidatorTx =>
  tx.type === TxType.DisableL1Validator;
export const isIncreaseL1ValidatorBalanceTx = (tx: TxDetails): tx is IncreaseL1ValidatorBalanceTx =>
  tx.type === TxType.IncreaseL1ValidatorBalance;
export const isRegisterL1ValidatorTx = (tx: TxDetails): tx is RegisterL1ValidatorTx =>
  tx.type === TxType.RegisterL1Validator;
export const isSetL1ValidatorWeightTx = (tx: TxDetails): tx is SetL1ValidatorWeightTx =>
  tx.type === TxType.SetL1ValidatorWeight;
export const isAddAutoRenewedValidatorTx = (tx: TxDetails): tx is AddAutoRenewedValidatorTx =>
  tx.type === TxType.AddAutoRenewedValidator;
export const isSetAutoRenewedValidatorConfigTx = (tx: TxDetails): tx is SetAutoRenewedValidatorConfigTx =>
  tx.type === TxType.SetAutoRenewedValidatorConfig;

export const isStakingDetails = (tx: TxDetails): tx is StakingDetails =>
  isAddPermissionlessDelegatorTx(tx) ||
  isAddPermissionlessValidatorTx(tx) ||
  isAddSubnetValidatorTx(tx) ||
  isRemoveSubnetValidatorTx(tx) ||
  isAddAutoRenewedValidatorTx(tx) ||
  isSetAutoRenewedValidatorConfigTx(tx);
export const isExportImportTxDetails = (tx: TxDetails): tx is ExportImportTxDetails => isExportTx(tx) || isImportTx(tx);
export const isChainDetails = (tx: TxDetails): tx is ChainDetails => isBaseTx(tx);
export const isBlockchainDetails = (tx: TxDetails): tx is BlockchainDetails => isCreateChainTx(tx);
export const isSubnetDetails = (tx: TxDetails): tx is SubnetDetails => isCreateSubnetTx(tx);
