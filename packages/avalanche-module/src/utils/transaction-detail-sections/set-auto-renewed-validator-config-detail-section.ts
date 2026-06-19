import type { DetailItem, DetailSection, SetAutoRenewedValidatorConfigTx } from '@avalabs/vm-module-types';
import { currencyItem, nodeIDItem, textItem } from '@internal/utils';
import { AVAX_NONEVM_DENOMINATION } from '../../constants';

const SECONDS_IN_DAY = 60 * 60 * 24;
// `autoCompoundRewardShares` is stored in millionths (percentage × 10,000) per
// ACP-236 — i.e. 1,000,000 = 100%. Dividing by 10,000 yields the percentage.
const PPM_TO_PERCENT_DIVISOR = 10_000;

export const setAutoRenewedValidatorConfigDetailSection = (tx: SetAutoRenewedValidatorConfigTx, symbol: string) => {
  const details: DetailSection[] = [];

  const { txFee, txId, autoCompoundRewardShares, period } = tx;

  const items: DetailItem[] = [
    nodeIDItem('Validator Tx ID', txId),
    textItem('Cycle duration', `${Number(period) / SECONDS_IN_DAY} days`),
    textItem('Compound rewards percentage', `${autoCompoundRewardShares / PPM_TO_PERCENT_DIVISOR} %`),
  ];

  details.push({
    title: 'Staking Details',
    items: items,
  });

  if (txFee) {
    details.push({
      title: 'Network Fee',
      items: [currencyItem('Fee Amount', txFee, AVAX_NONEVM_DENOMINATION, symbol)],
    });
  }

  return details;
};
