import { type AssetDiffs, processBalanceChange, processTransactionSimulation } from './process-transaction-simulation';
import { RpcMethod, TokenType, type TokenApprovals } from '@avalabs/vm-module-types';
import simulationResult from './__mocks__/simulation-result';
import Blockaid from '@blockaid/client';

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

  it('should use ABI-parsed approval value when simulation reports zero-value approval (retry scenario)', async () => {
    const zeroExposureSimulation = structuredClone(simulationResult);
    zeroExposureSimulation.simulation.account_summary.traces = [
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

    const expectedApprovalAmount = BigInt('0x0f4240');

    mockParseWithErc20Abi.mockResolvedValue({
      balanceChange: undefined,
      tokenApprovals: {
        isEditable: true,
        approvals: [
          {
            token: {
              type: TokenType.ERC20,
              name: 'USD Coin',
              chainId: 43112,
              symbol: 'USDC',
              decimals: 6,
              address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
            },
            spenderAddress: '0xSpenderAddress',
            value: expectedApprovalAmount,
          },
        ],
      },
    });

    const params = {
      from: '0xFromAddress',
      to: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
      value: '0x0',
      data: '0x095ea7b3',
    };
    const chainId = 43112;
    const provider = {} as any; // eslint-disable-line

    const { tokenApprovals } = await processTransactionSimulation({
      rpcMethod: RpcMethod.ETH_SEND_TRANSACTION,
      params,
      chainId,
      provider,
      simulationResult: zeroExposureSimulation as unknown as Blockaid.TransactionScanResponse,
    });

    expect(mockParseWithErc20Abi).toHaveBeenCalledWith(params, chainId, provider);
    expect(tokenApprovals).toBeDefined();
    expect(tokenApprovals!.approvals[0]!.value).toBe(expectedApprovalAmount);
  });

  it('should not call ABI parser when simulation reports non-zero approval value', async () => {
    const params = {
      from: '0xFromAddress',
      to: '0xToAddress',
      value: '0xValue',
    };
    const chainId = 43112;
    const provider = {} as any; // eslint-disable-line

    await processTransactionSimulation({
      rpcMethod: RpcMethod.ETH_SEND_TRANSACTION,
      params,
      chainId,
      provider,
      simulationResult: simulationResult as unknown as Blockaid.TransactionScanResponse,
    });

    expect(mockParseWithErc20Abi).not.toHaveBeenCalled();
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
