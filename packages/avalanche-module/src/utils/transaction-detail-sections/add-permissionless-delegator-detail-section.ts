import type { AddPermissionlessDelegatorTx, DetailItem, DetailSection } from '@avalabs/vm-module-types';
import { currencyItem, dateItem, nodeIDItem, textItem } from '@internal/utils';
import { AVAX_NONEVM_DENOMINATION } from '../../constants';
import { isPrimarySubnet } from '../../handlers/avalanche-send-transaction/utils/is-primary-subnet';

export const addPermissionlessDelegatorDetailSection = (tx: AddPermissionlessDelegatorTx, symbol: string) => {
  const details: DetailSection[] = [];
  const { txFee, nodeID, start, end, stake, subnetID } = tx;

  const items: DetailItem[] = [
    nodeIDItem('Node ID', nodeID),
    isPrimarySubnet(subnetID) ? textItem('Subnet ID', 'Primary Network') : nodeIDItem('Subnet ID', subnetID),
    currencyItem('Stake Amount', stake, AVAX_NONEVM_DENOMINATION, symbol),
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
