import type { DetailItem, DetailSection, RemoveSubnetValidatorTx } from '@avalabs/vm-module-types';
import { currencyItem, nodeIDItem } from '@internal/utils';
import { AVAX_NONEVM_DENOMINATION } from '../../constants';

export const removeSubnetValidatorDetailSection = (tx: RemoveSubnetValidatorTx, symbol: string) => {
  const details: DetailSection[] = [];
  const { txFee, nodeID, subnetID } = tx;

  const items: DetailItem[] = [nodeIDItem('Node ID', nodeID), nodeIDItem('Subnet ID', subnetID)];

  details.push({
    title: 'Staking Details',
    items,
  });

  if (txFee) {
    details.push({
      title: 'Network Fee',
      items: [currencyItem('Fee Amount', txFee, AVAX_NONEVM_DENOMINATION, symbol)],
    });
  }
  return details;
};
