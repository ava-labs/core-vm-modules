import type { DetailItem, DetailSection, SetL1ValidatorWeightTx } from '@avalabs/vm-module-types';
import { currencyItem, textItem } from '@internal/utils';
import { AVAX_NONEVM_DENOMINATION } from '../../constants';
import type { SignedOwnerDetails } from '../get-signed-owner-details';
import { decodeFailureItems } from './owner-items';

export const setL1ValidatorWeightDetailSection = (
  tx: SetL1ValidatorWeightTx,
  symbol: string,
  signedOwners?: SignedOwnerDetails,
) => {
  const details: DetailSection[] = [];

  const { txFee } = tx;

  // Without these two fields the screen showed a fee and nothing else - not which validator
  // is being retargeted, nor that a weight of zero removes it from the L1 outright.
  const items: DetailItem[] = [...decodeFailureItems(signedOwners)];

  if (signedOwners?.validationId) {
    items.push(textItem('Validation ID', signedOwners.validationId, 'vertical'));
  }

  if (signedOwners?.weight !== undefined) {
    items.push(
      textItem('New Weight', signedOwners.weight.toString()),
      ...(signedOwners.weight === 0n
        ? [
            textItem(
              'Warning',
              'A weight of 0 removes this validator from the L1. It will stop validating once this transaction is accepted.',
              'vertical',
            ),
          ]
        : []),
    );
  }

  if (items.length > 0) {
    details.push({
      title: 'L1 Details',
      items,
    });
  }

  if (txFee) {
    details.push({
      title: 'Network Fee',
      items: [currencyItem('Fee Amount', txFee, AVAX_NONEVM_DENOMINATION, symbol)],
    });
  }

  return details;
};
