import type { Avalanche } from '@avalabs/core-wallets-sdk';
import { parseTxDetails } from './parse-tx-details';
import { TxType } from '@avalabs/vm-module-types';

describe('parse-staking-details', () => {
  it('should return correct staking details for AddPermissionlessDelegatorTx', () => {
    const tx = {
      type: TxType.AddPermissionlessDelegator,
      nodeID: 'nodeID',
      subnetID: 'subnetID',
      start: '1',
      end: '2',
      stake: 1n,
      txFee: 1n,
    };
    const details = parseTxDetails({ ...tx } as Avalanche.AddPermissionlessDelegatorTx);
    expect(details).toEqual({
      type: TxType.AddPermissionlessDelegator,
      nodeID: 'nodeID',
      subnetID: 'subnetID',
      stake: 1n,
      start: '1',
      end: '2',
      txFee: 1n,
    });
  });
  it('should return correct staking details for AddPermissionlessValidatorTx', () => {
    const tx = {
      type: TxType.AddPermissionlessValidator,
      nodeID: 'nodeID',
      subnetID: 'subnetID',
      start: '1',
      end: '2',
      stake: 1n,
      txFee: 1n,
      publicKey: 'publicKey',
      signature: 'signature',
    };
    const details = parseTxDetails({ ...tx } as Avalanche.AddPermissionlessValidatorTx);
    expect(details).toEqual({
      type: TxType.AddPermissionlessValidator,
      nodeID: 'nodeID',
      subnetID: 'subnetID',
      stake: 1n,
      start: '1',
      end: '2',
      txFee: 1n,
      publicKey: 'publicKey',
      signature: 'signature',
    });
  });

  it('should return correct staking details for ExportTx', () => {
    const tx = {
      type: TxType.Export,
      destination: 'P',
      amount: 1n,
      chain: 'C',
      txFee: 1n,
    };
    const details = parseTxDetails({ ...tx } as Avalanche.ExportTx);
    expect(details).toEqual({
      type: TxType.Export,
      destination: 'P',
      amount: 1n,
      chain: 'C',
      txFee: 1n,
    });
  });

  it('should return correct staking details for ImportTx', () => {
    const tx = {
      type: TxType.Import,
      source: 'P',
      amount: 1n,
      chain: 'C',
      txFee: 1n,
    };
    const details = parseTxDetails({ ...tx } as Avalanche.ImportTx);
    expect(details).toEqual({
      type: TxType.Import,
      source: 'P',
      amount: 1n,
      chain: 'C',
      txFee: 1n,
    });
  });

  it('should return correct staking details for BaseTx', () => {
    const tx = {
      type: TxType.Base,
      chain: 'PVM',
      outputs: [
        {
          assetId: 'assetId',
          locktime: 1n,
          threshold: 1n,
          amount: 1n,
          assetDescription: {
            assetID: 'assetID',
            name: 'avalanche-p',
            symbol: 'avax',
            denomination: 9,
          },
          owners: [],
          isAvax: true,
        },
      ],
      memo: 'memo',
    };
    const details = parseTxDetails({ ...tx } as unknown as Avalanche.BaseTx);
    expect(details).toEqual({
      type: TxType.Base,
      chain: 'PVM',
      outputs: [
        {
          assetId: 'assetId',
          locktime: 1n,
          threshold: 1n,
          amount: 1n,
          assetDescription: {
            assetID: 'assetID',
            name: 'avalanche-p',
            symbol: 'avax',
            denomination: 9,
          },
          owners: [],
          isAvax: true,
        },
      ],
      memo: 'memo',
    });
  });

  it('should return correct staking details for AddSubnetValidatorTx', () => {
    const tx = {
      type: TxType.AddSubnetValidator,
      nodeID: 'nodeID',
      stake: 1n,
      start: '1',
      end: '2',
      txFee: 1n,
    };
    const details = parseTxDetails({ ...tx } as Avalanche.AddSubnetValidatorTx);
    expect(details).toEqual({
      type: TxType.AddSubnetValidator,
      nodeID: 'nodeID',
      stake: 1n,
      start: '1',
      end: '2',
      txFee: 1n,
    });
  });

  it('should return correct staking details for CreateChainTx', () => {
    const tx = {
      type: TxType.CreateChain,
      chainName: 'chainName',
      chainID: 'chainId',
      vmID: 'vmId',
      genesisData: 'genesisData',
    };
    const details = parseTxDetails({ ...tx } as Avalanche.CreateChainTx);
    expect(details).toEqual({
      type: TxType.CreateChain,
      chainName: 'chainName',
      chainID: 'chainId',
      vmID: 'vmId',
      genesisData: 'genesisData',
    });
  });

  it('should return correct staking details for CreateSubnetTx', () => {
    const tx = {
      type: TxType.CreateSubnet,
      threshold: 1,
      controlKeys: [],
      txFee: 1n,
    };
    const details = parseTxDetails({ ...tx } as unknown as Avalanche.CreateSubnetTx);
    expect(details).toEqual({
      type: TxType.CreateSubnet,
      threshold: 1,
      controlKeys: [],
      txFee: 1n,
    });
  });

  it('should return correct staking details for RemoveSubnetValidatorTx', () => {
    const tx = {
      type: TxType.RemoveSubnetValidator,
      nodeID: 'nodeID',
      subnetID: 'subnetID',
      txFee: 1n,
    };
    const details = parseTxDetails({ ...tx } as unknown as Avalanche.RemoveSubnetValidatorTx);
    expect(details).toEqual({
      type: TxType.RemoveSubnetValidator,
      nodeID: 'nodeID',
      subnetID: 'subnetID',
      txFee: 1n,
    });
  });
});
