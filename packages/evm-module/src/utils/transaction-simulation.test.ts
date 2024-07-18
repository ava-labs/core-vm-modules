import Blockaid from '@blockaid/client';
import { AlertType, TokenType } from '@avalabs/vm-module-types';
import type { TransactionParams } from '../types';
import { getBalanceChange, simulateTransaction } from './transaction-simulation';

jest.mock('@blockaid/client', () => {
  return jest.fn().mockImplementation(() => {
    return {
      evm: {
        transaction: {
          scan: jest.fn(),
        },
      },
    };
  });
});

describe('simulateTransaction', () => {
  const proxyApiUrl = 'https://proxy-api.example.com';
  const chainId = 1;
  const params: TransactionParams = {
    from: '0x123',
    to: '0x456',
    data: '0x789',
    value: '0x0',
    gas: '0x5208',
    gasPrice: '0x3b9aca00',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a warning alert for suspicious transaction', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Blockaid as any).mockImplementation(() => ({
      evm: {
        transaction: {
          scan: jest.fn().mockResolvedValue({
            validation: { result_type: 'Warning' },
            simulation: { status: 'Success', account_summary: { exposures: [], assets_diffs: [] } },
          }),
        },
      },
    }));

    const result = await simulateTransaction({ dAppUrl: 'example.com', params, chainId, proxyApiUrl });

    expect(result.alert).toEqual({
      type: AlertType.WARNING,
      details: {
        title: 'Suspicious Transaction',
        description: 'Use caution, this transaction may be malicious.',
      },
    });
  });

  it('should return a danger alert for malicious transaction', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Blockaid as any).mockImplementation(() => ({
      evm: {
        transaction: {
          scan: jest.fn().mockResolvedValue({
            validation: { result_type: 'Malicious' },
            simulation: { status: 'Success', account_summary: { exposures: [], assets_diffs: [] } },
          }),
        },
      },
    }));

    const result = await simulateTransaction({ dAppUrl: 'example.com', params, chainId, proxyApiUrl });

    expect(result.alert).toEqual({
      type: AlertType.DANGER,
      details: {
        title: 'Scam Transaction',
        description: 'This transaction is malicious, do not proceed.',
        actionTitles: {
          reject: 'Reject Transaction',
          proceed: 'Proceed Anyway',
        },
      },
    });
  });

  it('should return token approvals and balance changes for successful simulation', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Blockaid as any).mockImplementation(() => ({
      evm: {
        transaction: {
          scan: jest.fn().mockResolvedValue({
            validation: { result_type: 'Benign' },
            simulation: {
              status: 'Success',
              account_summary: {
                exposures: [
                  {
                    asset: {
                      type: TokenType.ERC20,
                      address: '0xTokenAddress',
                      name: 'TokenName',
                      symbol: 'TKN',
                      decimals: 18,
                      logo_url: 'logo_url',
                    },
                    spenders: {
                      '0xSpenderAddress': {
                        exposure: [{ raw_value: '1', usd_price: '1' }],
                      },
                    },
                  },
                ],
                assets_diffs: [
                  {
                    asset: {
                      name: 'TokenName',
                      symbol: 'TKN',
                      decimals: 18,
                      logo_url: 'logo_url',
                      type: TokenType.ERC20,
                      address: '0xTokenAddress',
                    },
                    in: [{ value: '1', usd_price: '1' }],
                    out: [{ value: '1', usd_price: '1' }],
                  },
                ],
              },
            },
          }),
        },
      },
    }));

    const result = await simulateTransaction({ dAppUrl: 'example.com', params, chainId, proxyApiUrl });

    expect(result.tokenApprovals).toEqual([
      {
        token: {
          contractType: TokenType.ERC20,
          address: '0xTokenAddress',
          name: 'TokenName',
          symbol: 'TKN',
          decimals: 18,
          logoUri: 'logo_url',
        },
        spenderAddress: '0xSpenderAddress',
        value: '1',
        usdPrice: '1',
        logoUri: 'logo_url',
      },
    ]);

    expect(result.balanceChange).toEqual({
      ins: [
        {
          token: {
            contractType: TokenType.ERC20,
            address: '0xTokenAddress',
            name: 'TokenName',
            symbol: 'TKN',
            decimals: 18,
            logoUri: 'logo_url',
          },
          items: [
            {
              displayValue: '1',
              usdPrice: '1',
            },
          ],
        },
      ],
      outs: [
        {
          token: {
            contractType: TokenType.ERC20,
            address: '0xTokenAddress',
            name: 'TokenName',
            symbol: 'TKN',
            decimals: 18,
            logoUri: 'logo_url',
          },
          items: [
            {
              displayValue: '1',
              usdPrice: '1',
            },
          ],
        },
      ],
    });
  });
});

describe('getBalanceChange', () => {
  it('should sort asset diffs correctly within ins and outs', () => {
    const assetDiffs: Blockaid.AssetDiff[] = [
      {
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

    const result = getBalanceChange(assetDiffs);

    // Verify sorting logic for 'ins'
    expect(result.ins).toEqual([
      {
        token: {
          contractType: 'ERC20',
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
          contractType: 'ERC20',
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
    expect(result.outs).toEqual([
      {
        token: {
          contractType: 'ERC20',
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
          contractType: 'ERC20',
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
