import { type AssetDiffs, processBalanceChange, processTransactionSimulation } from './process-transaction-simulation';
import { AlertType, RpcMethod, TokenType, type TokenApprovals } from '@avalabs/vm-module-types';
import { Interface } from 'ethers';
import ERC20 from '@openzeppelin/contracts/build/contracts/ERC20.json';
import simulationResult from './__mocks__/simulation-result';
import { transactionAlerts } from './transaction-alerts';
import type { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';
import Blockaid from '@blockaid/client';

const emptyProvider = {} as unknown as JsonRpcBatchInternal;

jest.mock('@blockaid/client', () => {
  return jest.fn().mockImplementation(() => {
    return {};
  });
});

const mockParseWithErc20Abi = jest.fn().mockResolvedValue({
  tokenApprovals: undefined,
  balanceChange: undefined,
});
jest.mock('./parse-erc20-tx', () => ({
  parseWithErc20Abi: (...args: unknown[]) => mockParseWithErc20Abi(...args),
}));

describe('processTransactionSimulation', () => {
  beforeEach(() => {
    mockParseWithErc20Abi.mockReset().mockResolvedValue({
      tokenApprovals: undefined,
      balanceChange: undefined,
    });
  });

  it('should not mark transactions as suspicious if the simulation result is not present at all', async () => {
    const params = {
      from: '0xFromAddress',
      to: '0xToAddress',
      value: '0xValue',
    };
    const chainId = 43112;
    const provider = {} as any; // eslint-disable-line

    const result = await processTransactionSimulation({
      rpcMethod: RpcMethod.ETH_SEND_TRANSACTION,
      params,
      chainId,
      provider,
      simulationResult: undefined,
    });

    expect(result).toEqual(expect.objectContaining({ alert: undefined, isSimulationSuccessful: false }));
  });

  it.each(['Error', 'Benign'] as const)(
    'should not raise an alert when Blockaid validation result_type is %s',
    async (resultType) => {
      const clonedSimulation = structuredClone(simulationResult);
      clonedSimulation.validation.result_type = resultType;

      const result = await processTransactionSimulation({
        rpcMethod: RpcMethod.ETH_SEND_TRANSACTION,
        params: { from: '0xFromAddress', to: '0xToAddress', value: '0xValue' },
        chainId: 43112,
        provider: emptyProvider,
        simulationResult: clonedSimulation as unknown as Blockaid.TransactionScanResponse,
      });

      expect(result.alert).toBeUndefined();
    },
  );

  it('should not raise an alert when the validation section is missing', async () => {
    const clonedSimulation = structuredClone(simulationResult);
    // @ts-expect-error - intentionally removing validation to simulate an unscored response
    delete clonedSimulation.validation;

    const result = await processTransactionSimulation({
      rpcMethod: RpcMethod.ETH_SEND_TRANSACTION,
      params: { from: '0xFromAddress', to: '0xToAddress', value: '0xValue' },
      chainId: 43112,
      provider: emptyProvider,
      simulationResult: clonedSimulation as unknown as Blockaid.TransactionScanResponse,
    });

    expect(result.alert).toBeUndefined();
  });

  it('should raise a WARNING alert when validation result_type is Warning', async () => {
    const clonedSimulation = structuredClone(simulationResult);
    clonedSimulation.validation.result_type = 'Warning';

    const result = await processTransactionSimulation({
      rpcMethod: RpcMethod.ETH_SEND_TRANSACTION,
      params: { from: '0xFromAddress', to: '0xToAddress', value: '0xValue' },
      chainId: 43112,
      provider: emptyProvider,
      simulationResult: clonedSimulation as unknown as Blockaid.TransactionScanResponse,
    });

    expect(result.alert).toEqual(transactionAlerts[AlertType.WARNING]);
  });

  it('should raise a DANGER alert when validation result_type is Malicious', async () => {
    const clonedSimulation = structuredClone(simulationResult);
    clonedSimulation.validation.result_type = 'Malicious';

    const result = await processTransactionSimulation({
      rpcMethod: RpcMethod.ETH_SEND_TRANSACTION,
      params: { from: '0xFromAddress', to: '0xToAddress', value: '0xValue' },
      chainId: 43112,
      provider: emptyProvider,
      simulationResult: clonedSimulation as unknown as Blockaid.TransactionScanResponse,
    });

    expect(result.alert).toEqual(transactionAlerts[AlertType.DANGER]);
  });

  it('should get the tokenApprovals from the traces of the simulation result', async () => {
    const params = {
      from: '0xFromAddress',
      to: '0xToAddress',
      value: '0xValue',
    };
    const chainId = 43112;
    const provider = {} as any; // eslint-disable-line

    const { tokenApprovals } = (await processTransactionSimulation({
      rpcMethod: RpcMethod.ETH_SEND_TRANSACTION,
      params,
      chainId,
      provider,
      simulationResult: simulationResult as unknown as Blockaid.TransactionScanResponse,
    })) as { tokenApprovals: TokenApprovals };

    const {
      approvals: [testSimulationResult],
    } = tokenApprovals;

    expect(testSimulationResult).toEqual(
      expect.objectContaining({
        spenderAddress: '0xSpenderAddress',
        usdPrice: '111110555.55555545',
        value: '0x650e124ef1c7',
      }),
    );
  });

  it('should exclude zero-value ERC20 approvals from tokenApprovals (retry scenario)', async () => {
    const zeroTraceSimulation = structuredClone(simulationResult);

    zeroTraceSimulation.simulation.account_summary.traces = [
      {
        type: 'ERC20ExposureTrace',
        exposed: {
          raw_value: '0x0',
          value: 0,
          usd_price: 0,
        },
        trace_type: 'ExposureTrace',
        owner: '0xOwnerAddress',
        spender: '0xSpenderAddress',
        asset: {
          type: 'ERC20',
          address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
          logo_url: 'https://example.com/logo.png',
          decimals: 6,
          name: 'USD Coin',
          symbol: 'USDC',
        },
      },
    ];

    const params = {
      from: '0xFromAddress',
      to: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
      value: '0x0',
    };
    const chainId = 43112;
    const provider = {} as any; // eslint-disable-line

    const { tokenApprovals } = await processTransactionSimulation({
      rpcMethod: RpcMethod.ETH_SEND_TRANSACTION,
      params,
      chainId,
      provider,
      simulationResult: zeroTraceSimulation as unknown as Blockaid.TransactionScanResponse,
    });

    expect(tokenApprovals).toBeUndefined();
  });

  it('should exclude non-increasing ERC20 approvals (reduced allowance scenario)', async () => {
    const reducedTraceSimulation = structuredClone(simulationResult);

    reducedTraceSimulation.simulation.account_summary.traces = [
      {
        type: 'ERC20ExposureTrace',
        exposed: {
          raw_value: '0x2540be400',
          value: -50,
          usd_price: -50,
        },
        trace_type: 'ExposureTrace',
        owner: '0xOwnerAddress',
        spender: '0xSpenderAddress',
        asset: {
          type: 'ERC20',
          address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
          logo_url: 'https://example.com/logo.png',
          decimals: 6,
          name: 'USD Coin',
          symbol: 'USDC',
        },
      },
    ];

    const params = {
      from: '0xFromAddress',
      to: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
      value: '0x0',
    };
    const chainId = 43112;
    const provider = {} as any; // eslint-disable-line

    const { tokenApprovals } = await processTransactionSimulation({
      rpcMethod: RpcMethod.ETH_SEND_TRANSACTION,
      params,
      chainId,
      provider,
      simulationResult: reducedTraceSimulation as unknown as Blockaid.TransactionScanResponse,
    });

    expect(tokenApprovals).toBeUndefined();
  });

  it('should disregard asset traces in the traces array', async () => {
    const clonedSimulation = structuredClone(simulationResult);
    clonedSimulation.simulation.account_summary.traces = clonedSimulation.simulation.account_summary.traces.map(
      (trace) => ({
        ...trace,
        type: 'NativeAssetTrace',
        trace_type: 'AssetTrace',
      }),
    );

    const params = {
      from: '0xFromAddress',
      to: '0xToAddress',
      value: '0xValue',
    };
    const chainId = 43112;
    const provider = {} as any; // eslint-disable-line

    const { tokenApprovals } = (await processTransactionSimulation({
      rpcMethod: RpcMethod.ETH_SEND_TRANSACTION,
      params,
      chainId,
      provider,
      simulationResult: clonedSimulation as unknown as Blockaid.TransactionScanResponse,
    })) as { tokenApprovals: TokenApprovals };

    expect(tokenApprovals).toBeUndefined();
  });
});

describe('processTransactionSimulation ERC-20 approve fallback', () => {
  const TOKEN = '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E';
  const SPENDER = '0x1111111111111111111111111111111111111111';
  const erc20 = new Interface(ERC20.abi);
  const approveData = erc20.encodeFunctionData('approve', [SPENDER, 1000n]);
  const transferData = erc20.encodeFunctionData('transfer', [SPENDER, 1000n]);
  const parsedApprovals: TokenApprovals = {
    isEditable: true,
    approvals: [
      {
        token: { type: TokenType.ERC20, address: TOKEN, decimals: 6, name: 'USD Coin', symbol: 'USDC' },
        spenderAddress: SPENDER,
        value: '1000',
      },
    ],
  };

  const assetDiffs: AssetDiffs = [
    {
      asset_type: 'ERC20',
      asset: { type: 'ERC20', address: TOKEN, name: 'USD Coin', symbol: 'USDC', decimals: 6, logo_url: '' },
      in: [],
      out: [{ value: '1', usd_price: '1', raw_value: '0xf4240' }],
    },
  ];

  // Blockaid simulated fine but saw no exposure increase (re-approve of an equal or lower amount).
  const zeroExposureSimulation = () => {
    const cloned = structuredClone(simulationResult);
    cloned.simulation.account_summary.traces = [
      {
        type: 'ERC20ExposureTrace',
        exposed: { raw_value: '0x0', value: 0, usd_price: 0 },
        trace_type: 'ExposureTrace',
        owner: '0xOwnerAddress',
        spender: SPENDER,
        asset: { type: 'ERC20', address: TOKEN, logo_url: '', decimals: 6, name: 'USD Coin', symbol: 'USDC' },
      },
    ];
    (cloned.simulation.account_summary as { assets_diffs: unknown }).assets_diffs = assetDiffs;
    return cloned as unknown as Blockaid.TransactionScanResponse;
  };

  const run = (data: string, rpcMethod = RpcMethod.ETH_SEND_TRANSACTION, scan = zeroExposureSimulation()) =>
    processTransactionSimulation({
      rpcMethod,
      params: { from: '0xFromAddress', to: TOKEN, data, value: '0x0' },
      chainId: 43114,
      provider: emptyProvider,
      simulationResult: scan,
    });

  beforeEach(() => {
    mockParseWithErc20Abi.mockReset().mockResolvedValue({ tokenApprovals: parsedApprovals, balanceChange: undefined });
  });

  it('decodes spender and amount from calldata when Blockaid reports no approval for an approve call', async () => {
    const result = await run(approveData);

    expect(mockParseWithErc20Abi).toHaveBeenCalledWith(
      expect.objectContaining({ to: TOKEN, data: approveData }),
      43114,
      emptyProvider,
    );
    expect(result.isSimulationSuccessful).toBe(true);
    expect(result.tokenApprovals).toEqual({ isEditable: true, approvals: parsedApprovals.approvals });
  });

  it('keeps the Blockaid balance change when falling back', async () => {
    const result = await run(approveData);

    expect(result.balanceChange).toBeDefined();
    expect(result.balanceChange).toEqual(processBalanceChange(assetDiffs));
  });

  it('marks the fallback approval as not editable outside eth_sendTransaction', async () => {
    const result = await run(approveData, RpcMethod.ETH_SEND_TRANSACTION_BATCH);

    expect(result.tokenApprovals?.isEditable).toBe(false);
  });

  it('does not decode calldata when Blockaid already reported the approval', async () => {
    const result = await run(
      approveData,
      RpcMethod.ETH_SEND_TRANSACTION,
      simulationResult as unknown as Blockaid.TransactionScanResponse,
    );

    expect(mockParseWithErc20Abi).not.toHaveBeenCalled();
    expect(result.tokenApprovals?.approvals[0]?.spenderAddress).toBe('0xSpenderAddress');
  });

  it('does not decode calldata for non-approve calls', async () => {
    const result = await run(transferData);

    expect(mockParseWithErc20Abi).not.toHaveBeenCalled();
    expect(result.tokenApprovals).toBeUndefined();
  });

  it('leaves tokenApprovals empty when the target is not a readable ERC-20', async () => {
    mockParseWithErc20Abi.mockResolvedValueOnce({ tokenApprovals: undefined, balanceChange: undefined });

    const result = await run(approveData);

    expect(result.tokenApprovals).toBeUndefined();
  });
});

describe('processBalanceChange', () => {
  it('should sort asset diffs correctly within ins and outs', () => {
    const assetDiffs: AssetDiffs = [
      {
        asset_type: 'ERC20',
        asset: {
          type: 'ERC20',
          address: '0xTokenAddress1',
          name: 'TokenName1',
          symbol: 'TKN1',
          decimals: 18,
          logo_url: 'logo_url1',
        },
        in: [
          { value: '1', usd_price: '1', raw_value: '0x1' },
          { value: '2', usd_price: '2', raw_value: '0x2' },
        ],
        out: [
          { value: '3', usd_price: '3', raw_value: '0x3' },
          { value: '1', usd_price: '1', raw_value: '0x1' },
        ],
      },
      {
        asset_type: 'ERC20',
        asset: {
          type: 'ERC20',
          address: '0xTokenAddress2',
          name: 'TokenName2',
          symbol: 'TKN2',
          decimals: 18,
          logo_url: 'logo_url2',
        },
        in: [{ value: '4', usd_price: '4', raw_value: '0x4' }],
        out: [{ value: '5', usd_price: '5', raw_value: '0x5' }],
      },
    ];

    const result = processBalanceChange(assetDiffs);

    // Verify sorting logic for 'ins'
    expect(result?.ins).toEqual([
      {
        token: {
          type: 'ERC20',
          address: '0xTokenAddress2',
          name: 'TokenName2',
          symbol: 'TKN2',
          decimals: 18,
          logoUri: 'logo_url2',
        },
        items: [{ displayValue: '4', usdPrice: '4' }],
      },
      {
        token: {
          type: 'ERC20',
          address: '0xTokenAddress1',
          name: 'TokenName1',
          symbol: 'TKN1',
          decimals: 18,
          logoUri: 'logo_url1',
        },
        items: [
          { displayValue: '1', usdPrice: '1' },
          { displayValue: '2', usdPrice: '2' },
        ],
      },
    ]);

    // Verify sorting logic for 'outs'
    expect(result?.outs).toEqual([
      {
        token: {
          type: 'ERC20',
          address: '0xTokenAddress2',
          name: 'TokenName2',
          symbol: 'TKN2',
          decimals: 18,
          logoUri: 'logo_url2',
        },
        items: [{ displayValue: '5', usdPrice: '5' }],
      },
      {
        token: {
          type: 'ERC20',
          address: '0xTokenAddress1',
          name: 'TokenName1',
          symbol: 'TKN1',
          decimals: 18,
          logoUri: 'logo_url1',
        },
        items: [
          { displayValue: '3', usdPrice: '3' },
          { displayValue: '1', usdPrice: '1' },
        ],
      },
    ]);
  });
});
