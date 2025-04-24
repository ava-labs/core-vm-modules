import type { Avalanche } from '@avalabs/core-wallets-sdk';
import { TxType } from '@avalabs/vm-module-types';

export const parseTxDisplayTitle = (tx: Avalanche.Tx): string => {
  switch (tx.type) {
    case TxType.AddPermissionlessDelegator:
      return 'Do you want to add this delegator?';
    case TxType.AddPermissionlessValidator:
      return 'Do you want to add this validator?';
    case TxType.Export:
      return 'Do you approve this export?';
    case TxType.Import:
      return 'Do you approve this import?';
    case TxType.Base:
      return 'Do you approve this transaction?';
    case TxType.AddSubnetValidator:
      return 'Do you want to add this subnet validator?';
    case TxType.CreateChain:
      return 'Do you want to create this chain?';
    case TxType.CreateSubnet:
      return 'Do you want to create this subnet?';
    case TxType.RemoveSubnetValidator:
      return 'Do you want to remove this subnet validator?';
    case TxType.ConvertSubnetToL1:
      return 'Do you want to convert this subnet?';
    case TxType.DisableL1Validator:
      return 'Do you want to disable this validator?';
    case TxType.IncreaseL1ValidatorBalance:
      return 'Do you want to increase this validator balance?';
    case TxType.RegisterL1Validator:
      return 'Do you want to register this validator?';
    case TxType.SetL1ValidatorWeight:
      return 'Do you want to set this validator weight?';
    default:
      return 'Sign Message';
  }
};
