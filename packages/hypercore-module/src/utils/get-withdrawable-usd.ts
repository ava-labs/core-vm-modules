import Big from 'big.js';

import { HYPERCORE_USDC_SYMBOL } from '../constants';
import { spotCountsAsPerpCollateral } from './build-hypercore-tokens';
import type { ClearinghouseState, SpotClearinghouseState, UserAbstractionMode } from './schemas';

const BIG_ZERO = new Big(0);

const parseUsd = (value: string | number | undefined) => {
  if (value === undefined) {
    return BIG_ZERO;
  }

  try {
    const parsed = new Big(value);
    return parsed.gte(BIG_ZERO) ? parsed : BIG_ZERO;
  } catch {
    return BIG_ZERO;
  }
};

const getFreeSpotUsdcUsd = (spot: SpotClearinghouseState | undefined) => {
  const usdc = spot?.balances.find((balance) => balance.coin.toUpperCase() === HYPERCORE_USDC_SYMBOL);

  if (!usdc) {
    return BIG_ZERO;
  }

  const free = parseUsd(usdc.total).minus(parseUsd(usdc.hold));
  return free.gt(BIG_ZERO) ? free : BIG_ZERO;
};

/**
 * Hyperliquid USD that can actually be withdrawn / swapped via Markr.
 *
 * Mirrors fusion-sdk `hyperliquidGetWithdrawable` / core-web `getWithdrawableUsd`:
 * - `unifiedAccount` → perp `withdrawable` + free spot USDC
 * - other modes → perp `withdrawable` only (spot USDC is stranded on a separate ledger)
 */
export const getWithdrawableUsd = (
  perp: ClearinghouseState | undefined,
  spot: SpotClearinghouseState | undefined,
  abstractionMode: UserAbstractionMode | undefined,
) => {
  const perpWithdrawable = parseUsd(perp?.withdrawable);

  if (spotCountsAsPerpCollateral(abstractionMode)) {
    return perpWithdrawable.plus(getFreeSpotUsdcUsd(spot));
  }

  return perpWithdrawable;
};
