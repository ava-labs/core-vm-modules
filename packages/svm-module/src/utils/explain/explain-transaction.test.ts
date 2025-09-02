import { AlertType, type Network } from '@avalabs/vm-module-types';

import type { getProvider } from '../get-provider';
import { transactionAlerts } from '../transaction-alerts';

import { parseTransaction } from './parse-transaction';
import { explainTransaction } from './explain-transaction';
import type { ExplainTxParams } from './types';
import { scanSolanaTransaction } from './blockaid/scan-solana-transaction';

jest.mock('./blockaid/scan-solana-transaction');
jest.mock('./parse-transaction');

const mockBlockaid = {
  solana: {
    message: {
      scan: jest.fn(),
    },
  },
};

describe('explainTransaction', () => {
  const mockNetwork = {
    caipId: 'mockCaipId',
    networkToken: { symbol: 'SOL', decimals: 9 },
    tokens: [],
  } as unknown as Network;

  const mockProvider = jest.fn() as unknown as ReturnType<typeof getProvider>;

  const mockSimulationParams: ExplainTxParams = {
    params: {
      account: 'mockAccount',
      chain: 'mainnet',
      transactionBase64: 'mockTransactionBase64',
    },
    dAppUrl: 'https://dapp.example.com',
    blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return simulation result with balance changes and details when simulation is successful', async () => {
    const mockScanResponse = {
      result: {
        simulation: {
          account_summary: {
            account_assets_diff: [
              {
                asset: { type: 'SOL', decimals: 9 },
                in: { value: 200 },
                out: { value: 100 },
              },
            ],
          },
        },
        validation: { result_type: 'Success' },
      },
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    jest.mocked(scanSolanaTransaction).mockResolvedValueOnce(mockScanResponse);

    const result = await explainTransaction({
      simulationParams: mockSimulationParams,
      network: mockNetwork,
      provider: mockProvider,
    });

    expect(result).toEqual({
      isSimulationSuccessful: true,
      details: [
        {
          items: [
            {
              label: 'Raw Data',
              type: 'data',
              value: 'mockTransactionBase64',
            },
            {
              label: 'Account',
              type: 'address',
              value: 'mockAccount',
            },
          ],
          title: 'Transaction Details',
        },
      ],
      alert: undefined,
      balanceChange: {
        ins: [
          {
            token: {
              name: 'SOL',
              symbol: 'SOL',
              decimals: 9,
              description: '',
              logoUri: undefined,
            },
            items: [
              {
                displayValue: '200',
                usdPrice: undefined,
              },
            ],
          },
        ],
        outs: [
          {
            token: {
              name: 'SOL',
              symbol: 'SOL',
              decimals: 9,
              description: '',
              logoUri: undefined,
            },
            items: [
              {
                displayValue: '100',
                usdPrice: undefined,
              },
            ],
          },
        ],
      },
    });
  });

  it('should return alert when simulation fails', async () => {
    const mockScanResponse = {
      status: 'ERROR',
      result: {
        simulation: null,
        validation: {
          result_type: 'Benign',
          reason: '',
          features: [],
          extended_features: [],
        },
      },
      error: 'The transaction was reverted',
      error_details: {
        type: 'InstructionError',
        message: 'account does not have enough SOL to perform the operation',
        number: 1,
        code: 'ResultWithNegativeLamports',
        transaction_index: 0,
        instruction_index: 0,
        program_account: '11111111111111111111111111111111',
      },
    };

    jest.mocked(scanSolanaTransaction).mockResolvedValueOnce(
      mockScanResponse as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    );

    const mockParseTransaction = {
      balanceChange: {
        ins: [],
        outs: [],
      },
      details: [{ title: 'Mock section', items: [] }],
    };

    jest.mocked(parseTransaction).mockResolvedValueOnce(
      mockParseTransaction as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    );

    const result = await explainTransaction({
      simulationParams: mockSimulationParams,
      network: mockNetwork,
      provider: mockProvider,
    });

    expect(result.alert).toEqual({
      type: AlertType.WARNING,
      details: {
        title: 'This transaction will likely be reverted',
        description: 'Your account does not have enough SOL to perform the operation',
      },
    });
  });

  it('should return parsed transaction details', async () => {
    const mockParseTransaction = {
      balanceChange: {
        ins: [],
        outs: [],
      },
      details: [{ title: 'Mock section', items: [] }],
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    jest.mocked(scanSolanaTransaction).mockResolvedValueOnce(null);
    jest.mocked(parseTransaction).mockResolvedValueOnce(mockParseTransaction);

    const result = await explainTransaction({
      simulationParams: mockSimulationParams,
      network: mockNetwork,
      provider: mockProvider,
    });

    expect(result).toEqual({
      isSimulationSuccessful: false,
      details: [
        {
          title: 'Transaction Details',
          items: [{ label: 'Raw Data', type: 'data', value: mockSimulationParams.params.transactionBase64 }],
        },
        { title: 'Mock section', items: [] },
      ],
      alert: transactionAlerts[AlertType.WARNING],
      balanceChange: {
        ins: [],
        outs: [],
      },
    });
  });

  it('should return danger alert when validation result is Warning', async () => {
    const mockScanResponse = {
      result: {
        simulation: {
          account_summary: {
            account_assets_diff: [],
          },
        },
        validation: { result_type: 'Warning' },
      },
    };

    jest.mocked(scanSolanaTransaction).mockResolvedValueOnce(mockScanResponse as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    const result = await explainTransaction({
      simulationParams: mockSimulationParams,
      network: mockNetwork,
      provider: mockProvider,
    });

    expect(result.alert).toEqual(transactionAlerts[AlertType.WARNING]);
  });

  it('should return danger alert when validation result is Malicious', async () => {
    const mockScanResponse = {
      result: {
        simulation: {
          account_summary: {
            account_assets_diff: [],
          },
        },
        validation: { result_type: 'Malicious' },
      },
    };

    jest.mocked(scanSolanaTransaction).mockResolvedValueOnce(mockScanResponse as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    const result = await explainTransaction({
      simulationParams: mockSimulationParams,
      network: mockNetwork,
      provider: mockProvider,
    });

    expect(result.alert).toEqual(transactionAlerts[AlertType.DANGER]);
  });

  it('should show "Interacting with" for swap transactions', async () => {
    const mockScanResponse = {
      result: {
        simulation: {
          account_summary: {
            account_assets_diff: [
              {
                asset: {
                  type: 'TOKEN',
                  name: 'USDC',
                  symbol: 'USDC',
                  address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                  decimals: 6,
                },
                in: null,
                out: { raw_value: 1000000, value: 1 }, // Swap out
              },
              {
                asset: {
                  type: 'TOKEN',
                  name: 'SOL',
                  symbol: 'SOL',
                  address: 'So11111111111111111111111111111111111111112',
                  decimals: 9,
                },
                in: { raw_value: 1000000000, value: 1 }, // Swap in
                out: null,
              },
            ],
          },
          assets_diff: {
            mockAccount: [
              {
                asset: {
                  type: 'TOKEN',
                  name: 'USDC',
                  symbol: 'USDC',
                  address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                  decimals: 6,
                },
                in: null,
                out: { raw_value: 1000000, value: 1 },
              },
              {
                asset: {
                  type: 'TOKEN',
                  name: 'SOL',
                  symbol: 'SOL',
                  address: 'So11111111111111111111111111111111111111112',
                  decimals: 9,
                },
                in: { raw_value: 1000000000, value: 1 },
                out: null,
              },
            ],
            contractAddress1: [
              {
                asset: {
                  type: 'TOKEN',
                  name: 'USDC',
                  symbol: 'USDC',
                  address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                  decimals: 6,
                },
                in: { raw_value: 1000000, value: 1 },
                out: null,
              },
            ],
            contractAddress2: [
              {
                asset: {
                  type: 'TOKEN',
                  name: 'SOL',
                  symbol: 'SOL',
                  address: 'So11111111111111111111111111111111111111112',
                  decimals: 9,
                },
                in: null,
                out: { raw_value: 1000000000, value: 1 },
              },
            ],
          },
        },
        validation: { result_type: 'Success' },
      },
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    jest.mocked(scanSolanaTransaction).mockResolvedValueOnce(mockScanResponse);

    const result = await explainTransaction({
      simulationParams: mockSimulationParams,
      network: mockNetwork,
      provider: mockProvider,
    });

    // Should show "Interacting with" for swaps
    const transactionDetails = result.details.find((detail) => detail.title === 'Transaction Details');
    expect(transactionDetails?.items).toContainEqual({
      label: 'Account',
      type: 'address',
      value: 'mockAccount',
    });
    expect(transactionDetails?.items).toContainEqual({
      label: 'Interacting with',
      type: 'addressList',
      value: ['contractAddress1', 'contractAddress2'],
    });
  });

  it('should show "From/To" for transfer transactions', async () => {
    const mockScanResponse = {
      result: {
        simulation: {
          account_summary: {
            account_assets_diff: [
              {
                asset: { type: 'SOL', decimals: 9 },
                in: null,
                out: { raw_value: 10000000, value: 0.01 }, // SOL transfer out
              },
            ],
          },
          assets_diff: {
            mockAccount: [
              {
                asset: { type: 'SOL', decimals: 9 },
                in: null,
                out: { raw_value: 10000000, value: 0.01 },
              },
            ],
            recipientAddress: [
              {
                asset: { type: 'SOL', decimals: 9 },
                in: { raw_value: 10000000, value: 0.01 },
                out: null,
              },
            ],
          },
        },
        validation: { result_type: 'Success' },
      },
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    jest.mocked(scanSolanaTransaction).mockResolvedValueOnce(mockScanResponse);

    const result = await explainTransaction({
      simulationParams: mockSimulationParams,
      network: mockNetwork,
      provider: mockProvider,
    });

    const transactionDetails = result.details.find((detail) => detail.title === 'Transaction Details');
    expect(transactionDetails?.items).toContainEqual({
      label: 'From',
      type: 'address',
      value: 'mockAccount',
    });
    expect(transactionDetails?.items).toContainEqual({
      label: 'To',
      type: 'address',
      value: 'recipientAddress',
    });
  });

  it('should handle simulation with empty account_assets_diff', async () => {
    const mockScanResponse = {
      result: {
        simulation: {
          account_summary: {
            account_assets_diff: [], // Empty array
          },
        },
        validation: { result_type: 'Success' },
      },
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    jest.mocked(scanSolanaTransaction).mockResolvedValueOnce(mockScanResponse);

    const result = await explainTransaction({
      simulationParams: mockSimulationParams,
      network: mockNetwork,
      provider: mockProvider,
    });

    // Should only show Account when no other addresses are affected
    const transactionDetails = result.details.find((detail) => detail.title === 'Transaction Details');
    expect(transactionDetails?.items).toContainEqual({
      label: 'Account',
      type: 'address',
      value: 'mockAccount',
    });
  });
});
