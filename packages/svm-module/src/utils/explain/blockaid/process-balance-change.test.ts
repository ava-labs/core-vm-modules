import { TokenType, type Network } from '@avalabs/vm-module-types';
import type Blockaid from '@blockaid/client';

import { processBalanceChange } from './process-balance-change';

describe('processBalanceChange', () => {
  const mockNetwork = {
    caipId: 'mockCaipId',
  } as Network;

  const mockSimulationResult = {
    account_summary: {
      account_assets_diff: [
        {
          asset: { type: 'TOKEN', address: 'tokenAddress', name: 'TokenName', symbol: 'TKN', decimals: 6 },
          in: { value: 100, usd_price: 1 },
          out: { value: 50, usd_price: 1 },
        },
        {
          asset: { type: 'SOL', decimals: 9 },
          in: { value: 200 },
          out: { value: 100 },
        },
        {
          asset: { type: 'UNKNOWN' },
          in: { value: 300 },
          out: { value: 150 },
        },
      ],
    },
  } as Blockaid.Solana.Message.MessageScanResponse.Result.Simulation;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process balance changes correctly for valid assets', () => {
    const { balanceChange } = processBalanceChange('', mockSimulationResult, mockNetwork);

    expect(balanceChange).toEqual({
      ins: [
        {
          token: {
            type: TokenType.SPL,
            address: 'tokenAddress',
            caip2Id: 'mockCaipId',
            contractType: TokenType.SPL,
            decimals: 6,
            name: 'TokenName',
            symbol: 'TKN',
            logoUri: undefined,
          },
          items: [
            {
              displayValue: '100',
              usdPrice: '1',
            },
          ],
        },
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
            type: TokenType.SPL,
            address: 'tokenAddress',
            caip2Id: 'mockCaipId',
            contractType: TokenType.SPL,
            decimals: 6,
            name: 'TokenName',
            symbol: 'TKN',
            logoUri: undefined,
          },
          items: [
            {
              displayValue: '50',
              usdPrice: '1',
            },
          ],
        },
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
    });
  });

  it('should skip processing for unknown asset types', () => {
    const { balanceChange } = processBalanceChange('', mockSimulationResult, mockNetwork);

    expect(balanceChange.ins).not.toContainEqual(
      expect.objectContaining({
        token: expect.objectContaining({ type: 'UNKNOWN' }),
      }),
    );
    expect(balanceChange.outs).not.toContainEqual(
      expect.objectContaining({
        token: expect.objectContaining({ type: 'UNKNOWN' }),
      }),
    );
  });

  it('should return empty ins and outs if account_assets_diff is undefined', () => {
    const emptySimulationResult = {
      account_summary: {
        account_assets_diff: undefined,
      },
    } as Blockaid.Solana.Message.MessageScanResponse.Result.Simulation;

    const { balanceChange } = processBalanceChange('', emptySimulationResult, mockNetwork);

    expect(balanceChange).toEqual({
      ins: [],
      outs: [],
    });
  });
});
