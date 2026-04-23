import type { DetailItem, DetailSection, RewardAutoRenewedValidatorTx } from '@avalabs/vm-module-types';
import { currencyItem, nodeIDItem } from '@internal/utils';
import { AVAX_NONEVM_DENOMINATION } from '../../constants';

export const rewardAutoRenewedValidatorDetailSection = (tx: RewardAutoRenewedValidatorTx, symbol: string) => {
  const details: DetailSection[] = [];

  const { txFee, txId } = tx;

  const items: DetailItem[] = [nodeIDItem('Validator Tx ID', txId)];

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
