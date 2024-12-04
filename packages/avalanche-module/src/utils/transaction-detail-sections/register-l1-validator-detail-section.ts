import type { DetailItem, DetailSection, RegisterL1ValidatorTx } from '@avalabs/vm-module-types';
import { currencyItem } from '@internal/utils';
import { AVAX_NONEVM_DENOMINATION } from '../../constants';

export const registerL1ValidatorDetailSection = (tx: RegisterL1ValidatorTx, symbol: string) => {
  const details: DetailSection[] = [];

  const { txFee, balance } = tx;

  const items: DetailItem[] = [currencyItem('Initial balance', balance, AVAX_NONEVM_DENOMINATION, symbol)];

  details.push({
    title: 'L1 Details',
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
