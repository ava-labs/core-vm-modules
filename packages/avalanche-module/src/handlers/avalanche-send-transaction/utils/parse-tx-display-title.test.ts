import { TxType } from '@avalabs/vm-module-types';
import { parseTxDisplayTitle } from './parse-tx-display-title';
import type { Avalanche } from '@avalabs/core-wallets-sdk';

describe('parse-display-data-title', () => {
  it('should return title Sign Message for unknwon tx', () => {
    const tx = { type: TxType.Unknown };
    const title = parseTxDisplayTitle({ ...tx } as Avalanche.UnknownTx);
    expect(title).toEqual('Sign Message');
  });
  it('should return title Add Delegator for AddPermissionlessDelegatorTx', () => {
    const tx = { type: TxType.AddPermissionlessDelegator };
    const title = parseTxDisplayTitle({ ...tx } as Avalanche.AddPermissionlessDelegatorTx);
    expect(title).toEqual('Add Delegator');
  });
  it('should return title Add Validator for AddPermissionlessValidatorTx', () => {
    const tx = { type: TxType.AddPermissionlessValidator };
    const title = parseTxDisplayTitle({ ...tx } as Avalanche.AddPermissionlessValidatorTx);
    expect(title).toEqual('Add Validator');
  });
  it('should return title Approve Export for ExportTx', () => {
    const tx = { type: TxType.Export };
    const title = parseTxDisplayTitle({ ...tx } as Avalanche.ExportTx);
    expect(title).toEqual('Approve Export');
  });
  it('should return title Approve Import for ImportTx', () => {
    const tx = { type: TxType.Import };
    const title = parseTxDisplayTitle({ ...tx } as Avalanche.ImportTx);
    expect(title).toEqual('Approve Import');
  });
  it('should return title Approve Transaction for BaseTx', () => {
    const tx = { type: TxType.Base };
    const title = parseTxDisplayTitle({ ...tx } as Avalanche.BaseTx);
    expect(title).toEqual('Approve Transaction');
  });
  it('should return title Add Subnet Validator for AddSubnetValidatorTx', () => {
    const tx = { type: TxType.AddSubnetValidator };
    const title = parseTxDisplayTitle({ ...tx } as Avalanche.AddSubnetValidatorTx);
    expect(title).toEqual('Add Subnet Validator');
  });
  it('should return title Approve Create Chain for CreateChainTx', () => {
    const tx = { type: TxType.CreateChain };
    const title = parseTxDisplayTitle({ ...tx } as Avalanche.CreateChainTx);
    expect(title).toEqual('Approve Create Chain');
  });
  it('should return title Approve Create Subnet for CreateSubnetTx', () => {
    const tx = { type: TxType.CreateSubnet };
    const title = parseTxDisplayTitle({ ...tx } as Avalanche.CreateSubnetTx);
    expect(title).toEqual('Approve Create Subnet');
  });
  it('should return title Remove Subnet Validator for RemoveSubnetValidatorTx', () => {
    const tx = { type: TxType.RemoveSubnetValidator };
    const title = parseTxDisplayTitle({ ...tx } as Avalanche.RemoveSubnetValidatorTx);
    expect(title).toEqual('Remove Subnet Validator');
  });
});
