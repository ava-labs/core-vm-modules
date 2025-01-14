import type { DetailItem, DetailSection, IncreaseL1ValidatorBalanceTx } from '@avalabs/vm-module-types';
import { currencyItem, nodeIDItem } from '@internal/utils';
import { AVAX_NONEVM_DENOMINATION } from '../../constants';

export const increaseL1ValidatorBalanceDetailSection = (tx: IncreaseL1ValidatorBalanceTx, symbol: string) => {
  const details: DetailSection[] = [];

  const { txFee, balance, validationId } = tx;

  const items: DetailItem[] = [
    nodeIDItem('Validation ID', validationId),
    currencyItem('Increase by amount', balance, AVAX_NONEVM_DENOMINATION, symbol),
  ];

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
