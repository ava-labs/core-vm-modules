import type { Avalanche } from '@avalabs/core-wallets-sdk';
import { TxType } from '@avalabs/vm-module-types';

export const parseTxDisplayTitle = (tx: Avalanche.Tx): string => {
  switch (tx.type) {
    case TxType.AddPermissionlessDelegator:
      return 'Add Delegator';
    case TxType.AddPermissionlessValidator:
      return 'Add Validator';
    case TxType.Export:
      return 'Approve Export';
    case TxType.Import:
      return 'Approve Import';
    case TxType.Base:
      return 'Approve Transaction';
    case TxType.AddSubnetValidator:
      return 'Add Subnet Validator';
    case TxType.CreateChain:
      return 'Approve Create Chain';
    case TxType.CreateSubnet:
      return 'Approve Create Subnet';
    case TxType.RemoveSubnetValidator:
      return 'Remove Subnet Validator';
    case TxType.ConvertSubnetToL1:
      return 'Convert Subnet to L1';
    case TxType.DisableL1Validator:
      return 'Disable L1 Validator';
    case TxType.IncreaseL1ValidatorBalance:
      return 'Increase L1 Validator Balance';
    case TxType.RegisterL1Validator:
      return 'Register L1 Validator';
    case TxType.SetL1ValidatorWeight:
      return 'Set L1 Validator Weight';
    default:
      return 'Sign Message';
  }
};
