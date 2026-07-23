import Big from 'big.js';

import { getWithdrawableUsd } from './get-withdrawable-usd';
import type { ClearinghouseState, SpotClearinghouseState } from './schemas';

describe('getWithdrawableUsd', () => {
  const spot: SpotClearinghouseState = {
    balances: [{ coin: 'USDC', token: 0, total: '10', hold: '2' }],
  };

  const perp = (withdrawable: string): ClearinghouseState => ({
    assetPositions: [],
    crossMarginSummary: { accountValue: '100' },
    withdrawable,
  });

  it('uses perp withdrawable only for non-unified accounts', () => {
    expect(getWithdrawableUsd(perp('5'), spot, 'default').toString()).toBe('5');
    expect(getWithdrawableUsd(perp('5'), spot, 'portfolioMargin').toString()).toBe('5');
  });

  it('adds free spot USDC for unified accounts', () => {
    expect(getWithdrawableUsd(perp('5'), spot, 'unifiedAccount').toString()).toBe('13');
  });

  it('ignores missing spot on unified accounts', () => {
    expect(getWithdrawableUsd(perp('5'), undefined, 'unifiedAccount').toString()).toBe('5');
  });

  it('treats missing withdrawable as zero', () => {
    expect(
      getWithdrawableUsd(
        {
          assetPositions: [],
          crossMarginSummary: { accountValue: '1' },
        },
        spot,
        'default',
      ).eq(new Big(0)),
    ).toBe(true);
  });
});
