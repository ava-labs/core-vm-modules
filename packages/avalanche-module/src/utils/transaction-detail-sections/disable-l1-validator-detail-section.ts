import type { DetailItem, DetailSection, DisableL1ValidatorTx } from '@avalabs/vm-module-types';
import { currencyItem, nodeIDItem } from '@internal/utils';
import { AVAX_NONEVM_DENOMINATION } from '../../constants';

export const disableL1ValidatorDetailSection = (tx: DisableL1ValidatorTx, symbol: string) => {
  const details: DetailSection[] = [];

  const { txFee, validationId } = tx;

  const items: DetailItem[] = [nodeIDItem('Validation ID', validationId)];

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
