import type { CreateSubnetTx, DetailSection } from '@avalabs/vm-module-types';
import { currencyItem, textItem } from '@internal/utils';
import { AVAX_NONEVM_DENOMINATION } from '../../constants';
import { addressListItem } from '@internal/utils/src/utils/detail-item';

export const subnetDetailSection = (tx: CreateSubnetTx, symbol: string) => {
  const details: DetailSection[] = [];
  const { txFee, threshold, controlKeys } = tx;

  details.push({
    title: 'L1 Details',
    items: [
      addressListItem(controlKeys.length > 1 ? 'Owners' : 'Owner', controlKeys),
      textItem('Signature Threshold', `${threshold}/${controlKeys.length}`, 'horizontal'),
    ],
  });
  if (txFee) {
    details.push({
      title: 'Network Fee',
      items: [currencyItem('Fee Amount', txFee, AVAX_NONEVM_DENOMINATION, symbol)],
    });
  }

  return details;
};
