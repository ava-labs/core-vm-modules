import type { Avalanche } from '@avalabs/core-wallets-sdk';
import { type VM, TxType, type TxDetails } from '@avalabs/vm-module-types';

export const parseTxDetails = (tx: Avalanche.Tx): TxDetails | undefined => {
  switch (tx.type) {
    case TxType.AddPermissionlessDelegator:
    case TxType.AddPermissionlessValidator:
    case TxType.AddSubnetValidator:
    case TxType.CreateChain:
    case TxType.CreateSubnet:
    case TxType.RemoveSubnetValidator:
      return tx as TxDetails;
    case TxType.ConvertSubnetToL1:
    case TxType.SetL1ValidatorWeight:
    case TxType.DisableL1Validator:
    case TxType.IncreaseL1ValidatorBalance:
    case TxType.RegisterL1Validator:
      return {
        ...tx,
        chain: tx.chain as VM,
      };
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
