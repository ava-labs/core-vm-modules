import type { AddPermissionlessValidatorTx, DetailItem, DetailSection } from '@avalabs/vm-module-types';
import { currencyItem, dateItem, nodeIDItem, textItem } from '@internal/utils';
import { AVAX_NONEVM_DENOMINATION } from '../../constants';
import { isPrimarySubnet } from '../../handlers/avalanche-send-transaction/utils/is-primary-subnet';

export const addPermissionlessValidatorDetailSection = (tx: AddPermissionlessValidatorTx, symbol: string) => {
  const details: DetailSection[] = [];
  const { txFee, nodeID, delegationFee, start, end, stake, subnetID, signature, publicKey } = tx;

  const items: DetailItem[] = [
    nodeIDItem('Node ID', nodeID),
    isPrimarySubnet(subnetID) ? textItem('Subnet ID', 'Primary Network') : nodeIDItem('Subnet ID', subnetID),
  ];

  if (publicKey && signature) {
    items.push(nodeIDItem('Public Key', publicKey), nodeIDItem('Proof', signature));
  }

  items.push(
    currencyItem('Stake Amount', stake, AVAX_NONEVM_DENOMINATION, symbol),
    textItem('Delegation Fee', `${delegationFee / 10000} %`),
    dateItem('Start Date', start),
    dateItem('End Date', end),
  );

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
