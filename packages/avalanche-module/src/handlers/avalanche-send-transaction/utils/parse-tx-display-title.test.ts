import { TxType } from '@avalabs/vm-module-types';
import { parseTxDisplayTitle } from './parse-tx-display-title';
import type { Avalanche } from '@avalabs/core-wallets-sdk';

describe('parse-display-data-title', () => {
  it('should return title Sign Message for unknwon tx', () => {
    const tx = { type: TxType.Unknown };
    const title = parseTxDisplayTitle({ ...tx } as Avalanche.UnknownTx);
    expect(title).toEqual('Sign Message');
  });
  it('should return title "Do you want to add this delegator?" for AddPermissionlessDelegatorTx', () => {
    const tx = { type: TxType.AddPermissionlessDelegator };
    const title = parseTxDisplayTitle({ ...tx } as Avalanche.AddPermissionlessDelegatorTx);
    expect(title).toEqual('Do you want to add this delegator?');
  });
  it('should return title "Do you want to add this validator?" for AddPermissionlessValidatorTx', () => {
    const tx = { type: TxType.AddPermissionlessValidator };
    const title = parseTxDisplayTitle({ ...tx } as Avalanche.AddPermissionlessValidatorTx);
    expect(title).toEqual('Do you want to add this validator?');
  });
  it('should return title "Do you approve this export?" for ExportTx', () => {
    const tx = { type: TxType.Export };
    const title = parseTxDisplayTitle({ ...tx } as Avalanche.ExportTx);
    expect(title).toEqual('Do you approve this export?');
  });
  it('should return title "Do you approve this import?" for ImportTx', () => {
    const tx = { type: TxType.Import };
    const title = parseTxDisplayTitle({ ...tx } as Avalanche.ImportTx);
    expect(title).toEqual('Do you approve this import?');
  });
  it('should return title "Do you approve this transaction?" for BaseTx', () => {
    const tx = { type: TxType.Base };
    const title = parseTxDisplayTitle({ ...tx } as Avalanche.BaseTx);
    expect(title).toEqual('Do you approve this transaction?');
  });
  it('should return title "Do you want to add this subnet validator?" for AddSubnetValidatorTx', () => {
    const tx = { type: TxType.AddSubnetValidator };
    const title = parseTxDisplayTitle({ ...tx } as Avalanche.AddSubnetValidatorTx);
    expect(title).toEqual('Do you want to add this subnet validator?');
  });
  it('should return title "Do you want to create this chain?" for CreateChainTx', () => {
    const tx = { type: TxType.CreateChain };
    const title = parseTxDisplayTitle({ ...tx } as Avalanche.CreateChainTx);
    expect(title).toEqual('Do you want to create this chain?');
  });
  it('should return title "Do you want to create this subnet?" for CreateSubnetTx', () => {
    const tx = { type: TxType.CreateSubnet };
    const title = parseTxDisplayTitle({ ...tx } as Avalanche.CreateSubnetTx);
    expect(title).toEqual('Do you want to create this L1?');
  });
  it('should return title "Do you want to remove this subnet validator?" for RemoveSubnetValidatorTx', () => {
    const tx = { type: TxType.RemoveSubnetValidator };
    const title = parseTxDisplayTitle({ ...tx } as Avalanche.RemoveSubnetValidatorTx);
    expect(title).toEqual('Do you want to remove this subnet validator?');
  });
});
