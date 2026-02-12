import type { AddPermissionlessDelegatorTx, DetailItem, DetailSection } from '@avalabs/vm-module-types';
import { addressItem, currencyItem, dateItem, nodeIDItem } from '@internal/utils';
import { AVAX_NONEVM_DENOMINATION } from '../../constants';
import { networkItem } from '@internal/utils/src/utils/detail-item';

export const addPermissionlessDelegatorDetailSection = (tx: AddPermissionlessDelegatorTx, symbol: string) => {
  const details: DetailSection[] = [];
  const { txFee, nodeID, start, end, stake } = tx;

  const basicInfo: DetailSection = {
    title: '',
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
