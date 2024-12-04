import type { DetailSection, SetL1ValidatorWeightTx } from '@avalabs/vm-module-types';
import { currencyItem } from '@internal/utils';
import { AVAX_NONEVM_DENOMINATION } from '../../constants';

export const setL1ValidatorWeightDetailSection = (tx: SetL1ValidatorWeightTx, symbol: string) => {
  const details: DetailSection[] = [];

  const { txFee } = tx;

  if (txFee) {
    details.push({
      title: 'Network Fee',
      items: [currencyItem('Fee Amount', txFee, AVAX_NONEVM_DENOMINATION, symbol)],
    });
  }

  return details;
};
