import type { AddPermissionlessValidatorTx, DetailItem, DetailSection, Network } from '@avalabs/vm-module-types';
import { addressItem, currencyItem, dateItem, nodeIDItem, textItem } from '@internal/utils';
import { AVAX_NONEVM_DENOMINATION } from '../../constants';
import { networkItem } from '@internal/utils/src/utils/detail-item';

type AddPermissionlessValidatorDetailSectionProps = {
  tx: AddPermissionlessValidatorTx;
  symbol: string;
  network: Network;
  signerAccount: string;
};

export const addPermissionlessValidatorDetailSection = ({
  tx,
  symbol,
  network,
  signerAccount,
}: AddPermissionlessValidatorDetailSectionProps) => {
  const details: DetailSection[] = [];
  const { txFee, nodeID, subnetID, delegationFee, start, end, stake } = tx;

  const basicInfo: DetailSection = {
    items: [
      addressItem('Account', signerAccount),
      networkItem('Network', {
        name: network.chainName,
        logoUri: network.logoUri,
      }),
    ],
  };

  details.push(basicInfo);

  // Staking on an arbitrary subnet is not the same commitment as the primary network, and
  // the node id alone does not say which one this is.
  const items: DetailItem[] = [nodeIDItem('Node', nodeID), nodeIDItem('Subnet ID', subnetID)];

  items.push(
    currencyItem('Stake Amount', stake, AVAX_NONEVM_DENOMINATION, symbol),
    textItem('Delegation Fee', `${delegationFee / 10000} %`),
    dateItem('Start', start),
    dateItem('End', end),
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
