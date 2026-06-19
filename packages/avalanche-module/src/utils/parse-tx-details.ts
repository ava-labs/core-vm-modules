import type { Avalanche } from '@avalabs/core-wallets-sdk';
import { type VM, TxType, type TxDetails } from '@avalabs/vm-module-types';

export const parseTxDetails = (tx: Avalanche.Tx): TxDetails | undefined => {
  switch (tx.type) {
    case TxType.AddPermissionlessDelegator:
      return { ...tx, type: TxType.AddPermissionlessDelegator };
    case TxType.AddPermissionlessValidator:
      return { ...tx, type: TxType.AddPermissionlessValidator };
    case TxType.AddSubnetValidator:
      return { ...tx, type: TxType.AddSubnetValidator };
    case TxType.CreateChain:
      return { ...tx, type: TxType.CreateChain };
    case TxType.CreateSubnet:
      return { ...tx, type: TxType.CreateSubnet };
    case TxType.RemoveSubnetValidator:
      return { ...tx, type: TxType.RemoveSubnetValidator };
    case TxType.AddAutoRenewedValidator:
      return { ...tx, type: TxType.AddAutoRenewedValidator };
    case TxType.SetAutoRenewedValidatorConfig:
      return { ...tx, type: TxType.SetAutoRenewedValidatorConfig };
    case TxType.ConvertSubnetToL1:
      return { ...tx, type: TxType.ConvertSubnetToL1, chain: tx.chain as VM };
    case TxType.SetL1ValidatorWeight:
      return { ...tx, type: TxType.SetL1ValidatorWeight, chain: tx.chain as VM };
    case TxType.DisableL1Validator:
      return { ...tx, type: TxType.DisableL1Validator, chain: tx.chain as VM };
    case TxType.IncreaseL1ValidatorBalance:
      return {
        ...tx,
        type: TxType.IncreaseL1ValidatorBalance,
        chain: tx.chain as VM,
      };
    case TxType.RegisterL1Validator:
      return { ...tx, type: TxType.RegisterL1Validator, chain: tx.chain as VM };
    case TxType.Export:
      return {
        ...tx,
        type: TxType.Export,
        chain: tx.chain as VM,
        destination: tx.destination as VM,
      };
    case TxType.Import:
      return {
        ...tx,
        type: TxType.Import,
        chain: tx.chain as VM,
        source: tx.source as VM,
      };
    case TxType.Base:
      return {
        ...tx,
        type: TxType.Base,
        chain: tx.chain as VM,
      };
    default:
      return undefined;
  }
};
