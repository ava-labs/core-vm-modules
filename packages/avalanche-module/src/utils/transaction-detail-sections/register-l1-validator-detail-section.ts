import type { DetailItem, DetailSection, RegisterL1ValidatorTx } from '@avalabs/vm-module-types';
import { currencyItem, nodeIDItem, textItem } from '@internal/utils';
import { AVAX_NONEVM_DENOMINATION } from '../../constants';
import type { SignedOwnerDetails } from '../get-signed-owner-details';
import { decodeFailureItems, ownerItems } from './owner-items';

export const registerL1ValidatorDetailSection = (
  tx: RegisterL1ValidatorTx,
  symbol: string,
  signedOwners?: SignedOwnerDetails,
) => {
  const details: DetailSection[] = [];

  const { txFee, balance } = tx;

  const items: DetailItem[] = [
    ...decodeFailureItems(signedOwners),
    currencyItem('Initial balance', balance, AVAX_NONEVM_DENOMINATION, symbol),
  ];

  // Which subnet the validator joins and how much weight it gets are part of the warp payload
  // this transaction signs, and neither is implied by the balance.
  if (signedOwners?.subnetId) {
    items.push(nodeIDItem('Subnet ID', signedOwners.subnetId));
  }

  if (signedOwners?.weight !== undefined) {
    items.push(textItem('Weight', signedOwners.weight.toString()));
  }

  // The addresses below can take the validator's leftover balance and switch it off. They are
  // chosen freely by whoever built the request, so pointing them at somebody else is not
  // gated by anything - it just was not shown.
  items.push(
    ...ownerItems('Owner of the Remaining Balance', signedOwners?.remainingBalanceOwner),
    ...ownerItems('Owner Able to Disable', signedOwners?.disableOwner),
  );

  details.push({
    title: 'L1 Details',
    items: items,
  });

  if (txFee) {
    details.push({
      title: 'Network Fee',
      items: [currencyItem('Fee Amount', txFee, AVAX_NONEVM_DENOMINATION, symbol)],
    });
  }

  return details;
};
