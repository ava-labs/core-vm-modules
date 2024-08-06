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
    default:
      return 'Sign Message';
  }
};
