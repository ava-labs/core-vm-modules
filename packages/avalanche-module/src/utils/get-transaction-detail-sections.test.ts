import { NetworkVMType, TxType, type Network, type NetworkToken, type TxDetails } from '@avalabs/vm-module-types';
import { getTransactionDetailSections } from './get-transaction-detail-sections';

const networkToken: NetworkToken = {
  decimals: 18,
  symbol: 'AVAX',
  name: 'Avalanche',
  logoUri: '',
};

const mockNetwork: Network = {
  chainId: 1,
  chainName: 'Test Network',
  rpcUrl: 'https://example.com',
  networkToken,
  vmName: NetworkVMType.PVM,
  logoUri: '',
};

const mockAccount = 'P-avax1mockaccount';

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

    const details = getTransactionDetailSections(txDetails, networkToken.symbol);
    const expectedDetails = [
      {
        title: 'Chain Details',
        items: [
          {
            label: 'Active chain',
            value: 'Avalanche X-Chain',
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
            value: 100n,
            type: 'currency',
            symbol: 'AVAX',
            maxDecimals: 9,
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

    const details = getTransactionDetailSections(txDetails, networkToken.symbol);
    const expectedDetails = [
      {
        items: [
          {
            label: 'Source Chain',
            value: 'Avalanche X-Chain',
            alignment: 'horizontal',
            type: 'text',
          },
          {
            label: 'Target Chain',
            value: 'Avalanche P-Chain',
            alignment: 'horizontal',
            type: 'text',
          },
        ],
      },
      {
        items: [
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

    const details = getTransactionDetailSections(txDetails, networkToken.symbol);
    const expectedDetails = [
      {
        items: [
          {
            label: 'Source Chain',
            value: 'Avalanche P-Chain',
            alignment: 'horizontal',
            type: 'text',
          },
          {
            label: 'Destination Chain',
            value: 'Avalanche X-Chain',
            alignment: 'horizontal',
            type: 'text',
          },
        ],
      },
      {
        items: [
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

    const details = getTransactionDetailSections(txDetails, networkToken.symbol);
    const expectedDetails = [
      {
        title: 'L1 Details',
        items: [
          {
            label: 'Owners',
            value: ['0xKey1', '0xKey2'],
            type: 'addressList',
          },
          {
            label: 'Signature Threshold',
            value: '2/2',
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

  it('should handle staking transactions for permissionless delegators', () => {
    const txDetails: TxDetails = {
      type: TxType.AddPermissionlessDelegator,
      nodeID: 'NodeID',
      subnetID: 'SubnetID',
      start: '1691234567',
      end: '1692234567',
      stake: 50n,
      txFee: 1n,
    };

    const details = getTransactionDetailSections(txDetails, networkToken.symbol, {
      network: mockNetwork,
      signerAccount: mockAccount,
    });
    const expectedDetails = [
      {
        items: [
          { label: 'Account', type: 'address', value: mockAccount },
          { label: 'Network', type: 'network', value: { name: mockNetwork.chainName, logoUri: mockNetwork.logoUri } },
        ],
      },
      {
        title: 'Staking Details',
        items: [
          {
            label: 'Node',
            value: 'NodeID',
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
            label: 'Start',
            value: '1691234567',
            type: 'date',
          },
          {
            label: 'End',
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
      subnetID: 'SubnetID',
      delegationFee: 1000,
      start: '1691234567',
      end: '1692234567',
      stake: 50n,
      txFee: 1n,
    };

    const details = getTransactionDetailSections(txDetails, networkToken.symbol, {
      network: mockNetwork,
      signerAccount: mockAccount,
    });
    const expectedDetails = [
      {
        items: [
          { label: 'Account', type: 'address', value: mockAccount },
          { label: 'Network', type: 'network', value: { name: mockNetwork.chainName, logoUri: mockNetwork.logoUri } },
        ],
      },
      {
        title: 'Staking Details',
        items: [
          {
            label: 'Node',
            value: 'NodeID',
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
            label: 'Start',
            value: '1691234567',
            type: 'date',
          },
          {
            label: 'End',
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

    const details = getTransactionDetailSections(txDetails, networkToken.symbol);
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

    const details = getTransactionDetailSections(txDetails, networkToken.symbol);
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

  it('should handle blockchain details with formatted genesis data', () => {
    // Create a realistic genesis JSON object
    const genesisJson = {
      config: {
        chainId: 43114,
        homesteadBlock: 0,
      },
      alloc: {
        '0x1234567890abcdef': { balance: '0x1000000' },
      },
      timestamp: '0x0',
      gasLimit: '0x1312D00',
    };

    // Genesis data comes as a JSON string (not hex-encoded)
    const genesisDataString = JSON.stringify(genesisJson);
    const expectedFormattedGenesis = JSON.stringify(genesisJson, null, 2);

    const txDetails: TxDetails = {
      type: TxType.CreateChain,
      chainID: 'chainID',
      chainName: 'chainName',
      vmID: 'vmID',
      genesisData: genesisDataString,
      txFee: 1n,
    };

    const details = getTransactionDetailSections(txDetails, networkToken.symbol);
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
            value: expectedFormattedGenesis,
            type: 'data',
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

  it('should handle blockchain details with invalid genesis data (error fallback)', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Use invalid JSON that cannot be parsed
    const invalidGenesisData = 'invalid-json-string';

    const txDetails: TxDetails = {
      type: TxType.CreateChain,
      chainID: 'chainID',
      chainName: 'chainName',
      vmID: 'vmID',
      genesisData: invalidGenesisData,
      txFee: 1n,
    };

    const details = getTransactionDetailSections(txDetails, networkToken.symbol);
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
            value: invalidGenesisData,
            type: 'data',
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
    consoleErrorSpy.mockRestore();
  });

  it('should handle convert subnet l1 validator details', () => {
    const txDetails: TxDetails = {
      chain: NetworkVMType.PVM,
      totalAvaxBurned: 1n,
      totalAvaxOutput: 1n,
      totalAvaxInput: 1n,
      isValidAvaxBurnedAmount: true,
      type: TxType.ConvertSubnetToL1,
      chainID: 'chainID',
      managerAddress: 'managerAddress',
      subnetID: 'subnetID',
      validators: [
        {
          balance: 100n,
          stake: 5n,
          nodeId: 'nodeId',
          remainingBalanceOwners: ['0xOwner1'],
          deactivationOwners: ['0xOwner2'],
        },
      ],
      txFee: 1n,
    };

    const details = getTransactionDetailSections(txDetails, networkToken.symbol);
    const expectedDetails = [
      {
        title: 'L1 Details',
        items: [
          {
            label: 'Subnet ID',
            value: 'subnetID',
            type: 'nodeID',
          },
          {
            label: 'Chain ID',
            value: 'chainID',
            type: 'nodeID',
          },
          {
            label: 'Manager Address',
            value: 'managerAddress',
            type: 'address',
          },
        ],
      },
      {
        title: 'Validators',
        items: [
          {
            label: 'Node ID',
            value: 'nodeId',
            type: 'nodeID',
          },
          {
            label: 'Balance',
            value: 100n,
            type: 'currency',
            maxDecimals: 9,
            symbol: 'AVAX',
          },
          {
            label: 'Stake',
            value: 5n,
            type: 'currency',
            maxDecimals: 9,
            symbol: 'AVAX',
          },
          {
            label: 'Owner Able to Deactivate',
            value: '0xOwner2',
            alignment: 'vertical',
            type: 'text',
          },
          {
            label: 'Owner of the Remaining Balance',
            value: '0xOwner1',
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

  it('should handle disable l1 validator details', () => {
    const txDetails: TxDetails = {
      chain: NetworkVMType.PVM,
      totalAvaxBurned: 1n,
      totalAvaxOutput: 1n,
      totalAvaxInput: 1n,
      isValidAvaxBurnedAmount: true,
      type: TxType.DisableL1Validator,
      validationId: 'validationId',
      txFee: 1n,
    };

    const details = getTransactionDetailSections(txDetails, networkToken.symbol);
    const expectedDetails = [
      {
        title: 'L1 Details',
        items: [
          {
            label: 'Validation ID',
            value: 'validationId',
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

  it('should handle register l1 validator details', () => {
    const txDetails: TxDetails = {
      chain: NetworkVMType.PVM,
      totalAvaxBurned: 1n,
      totalAvaxOutput: 1n,
      totalAvaxInput: 1n,
      isValidAvaxBurnedAmount: true,
      type: TxType.RegisterL1Validator,
      balance: 1n,
      txFee: 1n,
    };

    const details = getTransactionDetailSections(txDetails, networkToken.symbol);
    const expectedDetails = [
      {
        title: 'L1 Details',
        items: [
          {
            label: 'Initial balance',
            value: 1n,
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

  it('should handle set l1 validator weight details', () => {
    const txDetails: TxDetails = {
      chain: NetworkVMType.PVM,
      totalAvaxBurned: 1n,
      totalAvaxOutput: 1n,
      totalAvaxInput: 1n,
      isValidAvaxBurnedAmount: true,
      type: TxType.SetL1ValidatorWeight,
      txFee: 1n,
    };

    const details = getTransactionDetailSections(txDetails, networkToken.symbol);
    const expectedDetails = [
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

  it('should handle AddAutoRenewedValidator transactions (ACP-236 ppm conversion)', () => {
    const txDetails: TxDetails = {
      type: TxType.AddAutoRenewedValidator,
      nodeID: 'NodeID',
      stake: 50n,
      delegationFee: 300_000,
      weight: 50n,
      autoCompoundRewardShares: 500_000,
      period: 1_209_600n,
      txFee: 1n,
    };

    const details = getTransactionDetailSections(txDetails, networkToken.symbol, {
      network: mockNetwork,
      signerAccount: mockAccount,
    });
    const expectedDetails = [
      {
        items: [
          { label: 'Account', type: 'address', value: mockAccount },
          { label: 'Network', type: 'network', value: { name: mockNetwork.chainName, logoUri: mockNetwork.logoUri } },
        ],
      },
      {
        title: 'Staking Details',
        items: [
          { label: 'Node', value: 'NodeID', type: 'nodeID' },
          { label: 'Stake Amount', value: 50n, type: 'currency', maxDecimals: 9, symbol: 'AVAX' },
          { label: 'Delegation fee', value: '30 %', alignment: 'horizontal', type: 'text' },
          { label: 'Cycle duration', value: '14 days', alignment: 'horizontal', type: 'text' },
          { label: 'Compound rewards percentage', value: '50 %', alignment: 'horizontal', type: 'text' },
        ],
      },
      {
        title: 'Network Fee',
        items: [{ label: 'Fee Amount', value: 1n, type: 'currency', maxDecimals: 9, symbol: 'AVAX' }],
      },
    ];
    expect(details).toEqual(expectedDetails);
  });

  it.each([
    { raw: 0, expected: '0 %' },
    { raw: 1_000, expected: '0.1 %' },
    { raw: 300_000, expected: '30 %' },
    { raw: 1_000_000, expected: '100 %' },
  ])(
    'AddAutoRenewedValidator: autoCompoundRewardShares=$raw renders as $expected (ppm → percent)',
    ({ raw, expected }) => {
      const txDetails: TxDetails = {
        type: TxType.AddAutoRenewedValidator,
        nodeID: 'NodeID',
        stake: 1n,
        delegationFee: 0,
        weight: 1n,
        autoCompoundRewardShares: raw,
        period: 86_400n,
        txFee: 1n,
      };

      const details = getTransactionDetailSections(txDetails, networkToken.symbol, {
        network: mockNetwork,
        signerAccount: mockAccount,
      });
      const stakingItems = details?.find((s) => s.title === 'Staking Details')?.items;
      expect(stakingItems).toContainEqual({
        label: 'Compound rewards percentage',
        value: expected,
        alignment: 'horizontal',
        type: 'text',
      });
    },
  );

  it('should handle SetAutoRenewedValidatorConfig transactions (ACP-236 ppm conversion)', () => {
    const txDetails: TxDetails = {
      type: TxType.SetAutoRenewedValidatorConfig,
      txId: 'ValidatorTxId',
      autoCompoundRewardShares: 1_000_000,
      period: 2_592_000n,
      txFee: 1n,
    };

    const details = getTransactionDetailSections(txDetails, networkToken.symbol);
    const expectedDetails = [
      {
        title: 'Staking Details',
        items: [
          { label: 'Validator Tx ID', value: 'ValidatorTxId', type: 'nodeID' },
          { label: 'Cycle duration', value: '30 days', alignment: 'horizontal', type: 'text' },
          { label: 'Compound rewards percentage', value: '100 %', alignment: 'horizontal', type: 'text' },
        ],
      },
      {
        title: 'Network Fee',
        items: [{ label: 'Fee Amount', value: 1n, type: 'currency', maxDecimals: 9, symbol: 'AVAX' }],
      },
    ];
    expect(details).toEqual(expectedDetails);
  });

  it('should handle increase l1 validator balance details', () => {
    const txDetails: TxDetails = {
      chain: NetworkVMType.PVM,
      totalAvaxBurned: 1n,
      totalAvaxOutput: 1n,
      totalAvaxInput: 1n,
      isValidAvaxBurnedAmount: true,
      type: TxType.IncreaseL1ValidatorBalance,
      txFee: 1n,
      balance: 1n,
      validationId: 'validationId',
    };

    const details = getTransactionDetailSections(txDetails, networkToken.symbol);
    const expectedDetails = [
      {
        title: 'L1 Details',
        items: [
          {
            label: 'Validation ID',
            value: 'validationId',
            type: 'nodeID',
          },
          {
            label: 'Increase by amount',
            value: 1n,
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
});
