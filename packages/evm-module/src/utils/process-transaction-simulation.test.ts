import Blockaid from '@blockaid/client';
import { processBalanceChange } from './process-transaction-simulation';

jest.mock('@blockaid/client', () => {
  return jest.fn().mockImplementation(() => {
    return {};
  });
});

describe('processBalanceChange', () => {
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
