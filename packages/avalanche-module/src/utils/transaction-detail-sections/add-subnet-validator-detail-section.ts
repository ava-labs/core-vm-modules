import type { AddSubnetValidatorTx, DetailItem, DetailSection } from '@avalabs/vm-module-types';
import { currencyItem, dateItem, nodeIDItem, textItem } from '@internal/utils';
import { AVAX_NONEVM_DENOMINATION } from '../../constants';

export const addSubnetValidatorDetailSection = (tx: AddSubnetValidatorTx, symbol: string) => {
  const details: DetailSection[] = [];
  const { txFee, nodeID, start, end, subnetID, stake } = tx;

  const items: DetailItem[] = [
    nodeIDItem('Subnet ID', subnetID),
    nodeIDItem('Node ID', nodeID),
    // `stake` here is the validator's weight on the subnet - its share of the subnet's voting
    // power, not an AVAX amount. Approving this without seeing it is approving voting power
    // blind, so it is rendered as the plain number it is.
    textItem('Weight', stake.toString()),
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
