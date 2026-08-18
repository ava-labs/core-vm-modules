import type { DetailItem } from '@avalabs/vm-module-types';
import { addressListItem, textItem } from '@internal/utils';
import type { OwnerDetail, SignedOwnerDetails } from '../get-signed-owner-details';

/**
 * Renders an owner set that the transaction signs.
 *
 * A multi-signature owner set is not the same commitment as a single address, so the
 * threshold is shown whenever it applies rather than leaving the reader to assume every
 * listed address must agree.
 */
export const ownerItems = (label: string, owner?: OwnerDetail): DetailItem[] => {
  if (!owner || owner.addresses.length === 0) {
    return [];
  }

  const items: DetailItem[] = [addressListItem(label, owner.addresses)];

  if (owner.threshold !== undefined && owner.addresses.length > 1) {
    items.push(textItem(`${label} Threshold`, `${owner.threshold} of ${owner.addresses.length} required`));
  }

  return items;
};

/**
 * Says out loud that a signed payload could not be read, so a decode failure is never
 * mistaken for "this transaction has no owners".
 */
export const decodeFailureItems = (details?: SignedOwnerDetails): DetailItem[] =>
  details?.decodeFailed
    ? [
        textItem(
          'Warning',
          'Part of this transaction could not be decoded and is not shown below. Do not approve it unless you know exactly what it does.',
          'vertical',
        ),
      ]
    : [];
