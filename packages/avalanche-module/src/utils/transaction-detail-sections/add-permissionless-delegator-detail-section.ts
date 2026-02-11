import type { AddPermissionlessDelegatorTx, DetailItem, DetailSection } from '@avalabs/vm-module-types';
import { addressItem, currencyItem, dateItem, nodeIDItem, textItem } from '@internal/utils';
import { AVAX_NONEVM_DENOMINATION } from '../../constants';
import { isPrimarySubnet } from '../../handlers/avalanche-send-transaction/utils/is-primary-subnet';
import { networkItem } from '@internal/utils/src/utils/detail-item';

export const addPermissionlessDelegatorDetailSection = (tx: AddPermissionlessDelegatorTx, symbol: string) => {
  const details: DetailSection[] = [];
  const { txFee, nodeID, start, end, stake, subnetID } = tx;

  const basicInfo: DetailSection = {
    title: 'Basic Information',
    items: [
      addressItem('Account', tx.account),
      networkItem('Network', {
        name: tx.network.chainName,
        logoUri: tx.network.logoUri,
      }),
    ],
  };

  details.push(basicInfo);

  const items: DetailItem[] = [
    nodeIDItem('Node', nodeID),
    isPrimarySubnet(subnetID) ? textItem('Subnet ID', 'Primary Network') : nodeIDItem('Subnet ID', subnetID),
    currencyItem('Stake Amount', stake, AVAX_NONEVM_DENOMINATION, symbol),
    dateItem('Start', start),
    dateItem('End', end),
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
