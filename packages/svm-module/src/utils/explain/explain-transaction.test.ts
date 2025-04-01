import { AlertType, type Network } from '@avalabs/vm-module-types';

import type { getProvider } from '../get-provider';
import { transactionAlerts } from '../transaction-alerts';

import { parseTransaction } from './parse-transaction';
import { explainTransaction } from './explain-transaction';
import type { ExplainTxParams } from './types';
import { scanSolanaTransaction } from './blockaid/scan-solana-transaction';

jest.mock('./blockaid/scan-solana-transaction');
jest.mock('./parse-transaction');

describe('explainTransaction', () => {
  const mockNetwork = {
    caipId: 'mockCaipId',
    networkToken: { symbol: 'SOL', decimals: 9 },
    tokens: [],
  } as unknown as Network;

  const mockProvider = jest.fn() as unknown as ReturnType<typeof getProvider>;

  const mockSimulationParams: ExplainTxParams = {
    proxyApiUrl: 'https://example.com',
    params: {
      account: 'mockAccount',
      chain: 'mainnet',
      transactionBase64: 'mockTransactionBase64',
    },
    dAppUrl: 'https://dapp.example.com',
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

    expect(result.alert).toEqual(transactionAlerts[AlertType.DANGER]);
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

  it('should handle errors gracefully and return null simulation result', async () => {
    jest.mocked(scanSolanaTransaction).mockRejectedValueOnce(new Error('Mock error'));

    const result = await explainTransaction({
      simulationParams: mockSimulationParams,
      network: mockNetwork,
      provider: mockProvider,
    });

    expect(result).toEqual({
      isSimulationSuccessful: false,
      details: [],
      alert: undefined,
      balanceChange: { ins: [], outs: [] },
    });
  });
});
