import type { Avalanche } from '@avalabs/core-wallets-sdk';
import { type VM, TxType, type StakingDetails } from '@avalabs/vm-module-types';

export const parseStakingDetails = (tx: Avalanche.Tx): StakingDetails | undefined => {
  switch (tx.type) {
    case TxType.AddPermissionlessDelegator:
    case TxType.AddSubnetValidator:
    case TxType.CreateChain:
    case TxType.CreateSubnet:
    case TxType.RemoveSubnetValidator:
    case TxType.AddPermissionlessValidator:
      return tx;
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
