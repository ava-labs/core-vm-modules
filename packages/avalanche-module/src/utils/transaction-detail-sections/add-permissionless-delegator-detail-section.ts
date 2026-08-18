import type { AddPermissionlessDelegatorTx, DetailItem, DetailSection, Network } from '@avalabs/vm-module-types';
import { addressItem, currencyItem, dateItem, nodeIDItem } from '@internal/utils';
import { AVAX_NONEVM_DENOMINATION } from '../../constants';
import { networkItem } from '@internal/utils/src/utils/detail-item';
import type { SignedOwnerDetails } from '../get-signed-owner-details';
import { ownerItems } from './owner-items';

type AddPermissionlessDelegatorDetailSectionProps = {
  tx: AddPermissionlessDelegatorTx;
  symbol: string;
  network: Network;
  signerAccount: string;
  signedOwners?: SignedOwnerDetails;
};

export const addPermissionlessDelegatorDetailSection = ({
  tx,
  symbol,
  network,
  signerAccount,
  signedOwners,
}: AddPermissionlessDelegatorDetailSectionProps) => {
  const details: DetailSection[] = [];
  const { txFee, nodeID, subnetID, start, end, stake } = tx;

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

  const items: DetailItem[] = [
    nodeIDItem('Node', nodeID),
    // Delegating on an arbitrary subnet is not the same commitment as the primary network,
    // and the node id alone does not say which one this is.
    nodeIDItem('Subnet ID', subnetID),
    currencyItem('Stake Amount', stake, AVAX_NONEVM_DENOMINATION, symbol),
    dateItem('Start', start),
    dateItem('End', end),
    // The delegation rewards and the delegated stake are returned to this owner set, which
    // the request picks freely - it does not have to be the account that signs.
    ...ownerItems('Reward Owner', signedOwners?.delegationRewardOwner),
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
