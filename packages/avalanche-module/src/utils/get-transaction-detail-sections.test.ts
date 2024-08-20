import { NetworkVMType, TxType, type NetworkToken, type TxDetails } from '@avalabs/vm-module-types';
import { getTransactionDetailSections } from './get-transaction-detail-sections';

const networkToken: NetworkToken = {
  decimals: 18,
  symbol: 'AVAX',
  name: 'Avalanche',
  logoUri: '',
};

describe('getTransactionDetailSections - Detailed Tests', () => {
  it('should handle chain details', () => {
    const txDetails: TxDetails = {
      type: TxType.Base,
      chain: NetworkVMType.AVM,
      outputs: [
        {
          amount: 100n,
          owners: ['0xOwner1'],
          threshold: 1n,
          locktime: 1n,
          isAvax: true,
          assetId: '0xAssetID',
        },
      ],
      txFee: 1n,
    };

    const details = getTransactionDetailSections(txDetails, networkToken);
    const expectedDetails = [
      {
        title: 'Chain Details',
        items: [
          {
            label: 'Active chain',
            value: 'Avalanche X Chain',
            alignment: 'horizontal',
            type: 'text',
          },
        ],
      },
      {
        title: 'Balance Change',
        items: [
          {
            label: 'To',
            value: '0xOwner1',
            type: 'address',
          },
          {
            label: 'Amount',
            value: '0.0000000000000001 AVAX',
            alignment: 'horizontal',
            type: 'text',
          },
        ],
      },
      {
        title: 'Network Fee',
        items: [
          {
            label: 'Fee Amount',
            value: 1n,
            type: 'currency',
            maxDecimals: 9,
            symbol: 'AVAX',
          },
        ],
      },
    ];
    expect(details).toEqual(expectedDetails);
  });

  it('should handle export transactions', () => {
    const txDetails: TxDetails = {
      amount: 100n,
      chain: NetworkVMType.AVM,
      destination: NetworkVMType.PVM,
      type: TxType.Export,
      txFee: 1n,
    };

    const details = getTransactionDetailSections(txDetails, networkToken);
    const expectedDetails = [
      {
        title: 'Transaction Details',
        items: [
          {
            label: 'Source Chain',
            value: 'Avalanche X Chain',
            alignment: 'horizontal',
            type: 'text',
          },
          {
            label: 'Target Chain',
            value: 'Avalanche P Chain',
            alignment: 'horizontal',
            type: 'text',
          },
          {
            label: 'Transaction Type',
            value: 'Export',
            alignment: 'horizontal',
            type: 'text',
          },
          {
            label: 'Amount',
            value: 100n,
            type: 'currency',
            maxDecimals: 9,
            symbol: 'AVAX',
          },
        ],
      },
      {
        title: 'Network Fee',
        items: [
          {
            label: 'Fee Amount',
            value: 1n,
            type: 'currency',
            maxDecimals: 9,
            symbol: 'AVAX',
          },
        ],
      },
    ];
    expect(details).toEqual(expectedDetails);
  });

  it('should handle import transactions', () => {
    const txDetails: TxDetails = {
      amount: 100n,
      chain: NetworkVMType.AVM,
      source: NetworkVMType.PVM,
      type: TxType.Import,
      txFee: 1n,
    };

    const details = getTransactionDetailSections(txDetails, networkToken);
    const expectedDetails = [
      {
        title: 'Transaction Details',
        items: [
          {
            label: 'Source Chain',
            value: 'Avalanche P Chain',
            alignment: 'horizontal',
            type: 'text',
          },
          {
            label: 'Destination Chain',
            value: 'Avalanche X Chain',
            alignment: 'horizontal',
            type: 'text',
          },
          {
            label: 'Transaction Type',
            value: 'Import',
            alignment: 'horizontal',
            type: 'text',
          },
          {
            label: 'Amount',
            value: 100n,
            type: 'currency',
            maxDecimals: 9,
            symbol: 'AVAX',
          },
        ],
      },
      {
        title: 'Network Fee',
        items: [
          {
            label: 'Fee Amount',
            value: 1n,
            type: 'currency',
            maxDecimals: 9,
            symbol: 'AVAX',
          },
        ],
      },
    ];
    expect(details).toEqual(expectedDetails);
  });

  it('should handle subnet details', () => {
    const txDetails: TxDetails = {
      type: TxType.CreateSubnet,
      threshold: 2,
      controlKeys: ['0xKey1', '0xKey2'],
      txFee: 1n,
    };

    const details = getTransactionDetailSections(txDetails, networkToken);
    const expectedDetails = [
      {
        title: 'Subnet Details',
        items: [
          {
            label: 'Owners',
            value: '0xKey1\n0xKey2',
            alignment: 'vertical',
            type: 'text',
          },
          {
            label: 'Signature Threshold',
            value: '2/2',
            alignment: 'vertical',
            type: 'text',
          },
        ],
      },
      {
        title: 'Network Fee',
        items: [
          {
            label: 'Fee Amount',
            value: 1n,
            type: 'currency',
            maxDecimals: 9,
            symbol: 'AVAX',
          },
        ],
      },
    ];
    expect(details).toEqual(expectedDetails);
  });

  it('should handle staking transactions for permissionless delegators', () => {
    const txDetails: TxDetails = {
      type: TxType.AddPermissionlessDelegator,
      nodeID: 'NodeID',
      start: '1691234567',
      end: '1692234567',
      stake: 50n,
      subnetID: 'SubnetID',
      txFee: 1n,
    };

    const details = getTransactionDetailSections(txDetails, networkToken);
    const expectedDetails = [
      {
        title: 'Staking Details',
        items: [
          {
            label: 'Node ID',
            value: 'NodeID',
            type: 'nodeID',
          },
          {
            label: 'Subnet ID',
            value: 'SubnetID',
            type: 'nodeID',
          },
          {
            label: 'Stake Amount',
            value: 50n,
            type: 'currency',
            maxDecimals: 9,
            symbol: 'AVAX',
          },
          {
            label: 'Start Date',
            value: '1691234567',
            type: 'date',
          },
          {
            label: 'End Date',
            value: '1692234567',
            type: 'date',
          },
        ],
      },
      {
        title: 'Network Fee',
        items: [
          {
            label: 'Fee Amount',
            value: 1n,
            type: 'currency',
            maxDecimals: 9,
            symbol: 'AVAX',
          },
        ],
      },
    ];
    expect(details).toEqual(expectedDetails);
  });

  it('should handle staking transactions for permissionless validators', () => {
    const txDetails: TxDetails = {
      type: TxType.AddPermissionlessValidator,
      nodeID: 'NodeID',
      delegationFee: 1000,
      start: '1691234567',
      end: '1692234567',
      stake: 50n,
      subnetID: 'SubnetID',
      signature: 'Signature',
      publicKey: 'PublicKey',
      txFee: 1n,
    };

    const details = getTransactionDetailSections(txDetails, networkToken);
    const expectedDetails = [
      {
        title: 'Staking Details',
        items: [
          {
            label: 'Node ID',
            value: 'NodeID',
            type: 'nodeID',
          },
          {
            label: 'Subnet ID',
            value: 'SubnetID',
            type: 'nodeID',
          },
          {
            label: 'Public Key',
            value: 'PublicKey',
            type: 'nodeID',
          },
          {
            label: 'Proof',
            value: 'Signature',
            type: 'nodeID',
          },
          {
            label: 'Stake Amount',
            value: 50n,
            type: 'currency',
            maxDecimals: 9,
            symbol: 'AVAX',
          },
          {
            label: 'Delegation Fee',
            value: '0.1 %',
            alignment: 'horizontal',
            type: 'text',
          },
          {
            label: 'Start Date',
            value: '1691234567',
            type: 'date',
          },
          {
            label: 'End Date',
            value: '1692234567',
            type: 'date',
          },
        ],
      },
      {
        title: 'Network Fee',
        items: [
          {
            label: 'Fee Amount',
            value: 1n,
            type: 'currency',
            maxDecimals: 9,
            symbol: 'AVAX',
          },
        ],
      },
    ];
    expect(details).toEqual(expectedDetails);
  });

  it('should handle AddSubnetValidator transactions', () => {
    const txDetails: TxDetails = {
      type: TxType.AddSubnetValidator,
      nodeID: 'NodeID',
      start: '1691234567',
      end: '1692234567',
      subnetID: 'SubnetID',
      stake: 100n,
      txFee: 1n,
    };

    const details = getTransactionDetailSections(txDetails, networkToken);
    const expectedDetails = [
      {
        title: 'Staking Details',
        items: [
          {
            label: 'Subnet ID',
            value: 'SubnetID',
            type: 'nodeID',
          },
          {
            label: 'Node ID',
            value: 'NodeID',
            type: 'nodeID',
          },
          {
            label: 'Start Date',
            value: '1691234567',
            type: 'date',
          },
          {
            label: 'End Date',
            value: '1692234567',
            type: 'date',
          },
        ],
      },
      {
        title: 'Network Fee',
        items: [
          {
            label: 'Fee Amount',
            value: 1n,
            type: 'currency',
            maxDecimals: 9,
            symbol: 'AVAX',
          },
        ],
      },
    ];
    expect(details).toEqual(expectedDetails);
  });

  it('should handle RemoveSubnetValidator transactions', () => {
    const txDetails: TxDetails = {
      type: TxType.RemoveSubnetValidator,
      nodeID: 'NodeID',
      subnetID: 'SubnetID',
      txFee: 1n,
    };

    const details = getTransactionDetailSections(txDetails, networkToken);
    const expectedDetails = [
      {
        title: 'Staking Details',
        items: [
          {
            label: 'Node ID',
            value: 'NodeID',
            type: 'nodeID',
          },
          {
            label: 'Subnet ID',
            value: 'SubnetID',
            type: 'nodeID',
          },
        ],
      },
      {
        title: 'Network Fee',
        items: [
          {
            label: 'Fee Amount',
            value: 1n,
            type: 'currency',
            maxDecimals: 9,
            symbol: 'AVAX',
          },
        ],
      },
    ];
    expect(details).toEqual(expectedDetails);
  });

  it('should handle blockchain details', () => {
    const txDetails: TxDetails = {
      type: TxType.CreateChain,
      chainID: 'chainID',
      chainName: 'chainName',
      vmID: 'vmID',
      genesisData: 'genesisData',
      txFee: 1n,
    };

    const details = getTransactionDetailSections(txDetails, networkToken);
    const expectedDetails = [
      {
        title: 'Blockchain Details',
        items: [
          {
            label: 'Blockchain name',
            value: 'chainName',
            alignment: 'vertical',
            type: 'text',
          },
          {
            label: 'Blockchain ID',
            value: 'chainID',
            alignment: 'vertical',
            type: 'text',
          },
          {
            label: 'Virtual Machine ID',
            value: 'vmID',
            alignment: 'vertical',
            type: 'text',
          },
          {
            label: 'Genesis Data',
            value: 'genesisData',
            alignment: 'vertical',
            type: 'text',
          },
        ],
      },
      {
        title: 'Network Fee',
        items: [
          {
            label: 'Fee Amount',
            value: 1n,
            type: 'currency',
            maxDecimals: 9,
            symbol: 'AVAX',
          },
        ],
      },
    ];
    expect(details).toEqual(expectedDetails);
  });

  it('should handle network fees', () => {
    const txDetails: TxDetails = {
      type: TxType.CreateSubnet,
      threshold: 2,
      controlKeys: ['0xKey1', '0xKey2'],
      txFee: 1n,
    };

    const details = getTransactionDetailSections(txDetails, networkToken);
    const expectedDetails = [
      {
        title: 'Subnet Details',
        items: [
          {
            label: 'Owners',
            value: '0xKey1\n0xKey2',
            alignment: 'vertical',
            type: 'text',
          },
          {
            label: 'Signature Threshold',
            value: '2/2',
            alignment: 'vertical',
            type: 'text',
          },
        ],
      },
      {
        title: 'Network Fee',
        items: [
          {
            label: 'Fee Amount',
            value: 1n,
            type: 'currency',
            maxDecimals: 9,
            symbol: 'AVAX',
          },
        ],
      },
    ];
    expect(details).toEqual(expectedDetails);
  });
});
