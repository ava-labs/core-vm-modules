import type { AddSubnetValidatorTx, DetailItem, DetailSection } from '@avalabs/vm-module-types';
import { currencyItem, dateItem, nodeIDItem } from '@internal/utils';
import { AVAX_NONEVM_DENOMINATION } from '../../constants';

export const addSubnetValidatorDetailSection = (tx: AddSubnetValidatorTx, symbol: string) => {
  const details: DetailSection[] = [];
  const { txFee, nodeID, start, end, subnetID } = tx;

  const items: DetailItem[] = [
    nodeIDItem('Subnet ID', subnetID),
    nodeIDItem('Node ID', nodeID),
    dateItem('Start Date', start),
    dateItem('End Date', end),
  ];

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
