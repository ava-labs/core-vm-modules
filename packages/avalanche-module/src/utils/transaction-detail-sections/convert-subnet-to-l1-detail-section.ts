import type { ConvertSubnetToL1Tx, DetailItem, DetailSection } from '@avalabs/vm-module-types';
import { addressItem, currencyItem, nodeIDItem, textItem } from '@internal/utils';
import { AVAX_NONEVM_DENOMINATION } from '../../constants';

export const convertSubnetToL1DetailSection = (tx: ConvertSubnetToL1Tx, symbol: string) => {
  const details: DetailSection[] = [];
  const { txFee, chainID, managerAddress, subnetID, validators } = tx;

  const subnetItems: DetailItem[] = [
    nodeIDItem('Subnet ID', subnetID),
    nodeIDItem('Chain ID', chainID),
    addressItem('Manager Address', managerAddress),
  ];

  details.push({
    title: 'L1 Details',
    items: subnetItems,
  });

  validators.forEach(({ balance, stake, nodeId, remainingBalanceOwners, deactivationOwners }, index) => {
    const validatorItem: DetailItem[] = [
      nodeIDItem('Node ID', nodeId),
      currencyItem('Balance', balance, AVAX_NONEVM_DENOMINATION, symbol),
      currencyItem('Stake', stake, AVAX_NONEVM_DENOMINATION, symbol),
    ];
    if (deactivationOwners.length > 0) {
      validatorItem.push(
        textItem(
          `${deactivationOwners.length > 1 ? 'Owners' : 'Owner'} Able to Deactivate`,
          deactivationOwners.join('\n'),
          'vertical',
        ),
      );
    }
    if (remainingBalanceOwners.length > 0) {
      validatorItem.push(
        textItem(
          `${remainingBalanceOwners.length > 1 ? 'Owners' : 'Owner'} of the Remaining Balance`,
          remainingBalanceOwners.join('\n'),
          'vertical',
        ),
      );
    }

    details.push({
      title: index === 0 ? 'Validators' : undefined,
      items: validatorItem,
    });
  });

  if (txFee) {
    details.push({
      title: 'Network Fee',
      items: [currencyItem('Fee Amount', txFee, AVAX_NONEVM_DENOMINATION, symbol)],
    });
  }

  return details;
};
