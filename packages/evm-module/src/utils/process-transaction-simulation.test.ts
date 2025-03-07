import { type AssetDiffs, processBalanceChange, processTransactionSimulation } from './process-transaction-simulation';
import { RpcMethod, type TokenApprovals } from '@avalabs/vm-module-types';
import simulationResult from './__mocks__/simulation-result';
import Blockaid from '@blockaid/client';

jest.mock('@blockaid/client', () => {
  return jest.fn().mockImplementation(() => {
    return {};
  });
});

describe('processTransactionSimulation', () => {
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
