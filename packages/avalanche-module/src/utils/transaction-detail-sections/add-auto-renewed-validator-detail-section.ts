import type { AddAutoRenewedValidatorTx, DetailItem, DetailSection, Network } from '@avalabs/vm-module-types';
import { addressItem, currencyItem, nodeIDItem, textItem } from '@internal/utils';
import { AVAX_NONEVM_DENOMINATION } from '../../constants';
import { networkItem } from '@internal/utils/src/utils/detail-item';
import type { SignedOwnerDetails } from '../get-signed-owner-details';
import { ownerItems } from './owner-items';

type AddAutoRenewedValidatorDetailSectionProps = {
  tx: AddAutoRenewedValidatorTx;
  symbol: string;
  network: Network;
  signerAccount: string;
  signedOwners?: SignedOwnerDetails;
};

// Auto-renewal cycle (`period`) is provided in seconds.
const SECONDS_IN_DAY = 60 * 60 * 24;

// `delegationFee` and `autoCompoundRewardShares` are stored in millionths
// (percentage × 10,000), per ACP-236 — i.e. 1,000,000 = 100%, 300,000 = 30%.
// Dividing by 10,000 converts the raw value directly to a percentage.
const PPM_TO_PERCENT_DIVISOR = 10_000;

export const addAutoRenewedValidatorDetailSection = ({
  tx,
  symbol,
  network,
  signerAccount,
  signedOwners,
}: AddAutoRenewedValidatorDetailSectionProps) => {
  const details: DetailSection[] = [];
  const { txFee, nodeID, stake, delegationFee, autoCompoundRewardShares, period } = tx;

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
    currencyItem('Stake Amount', stake, AVAX_NONEVM_DENOMINATION, symbol),
    textItem('Delegation fee', `${delegationFee / PPM_TO_PERCENT_DIVISOR} %`),
    textItem('Cycle duration', `${Number(period) / SECONDS_IN_DAY} days`),
    textItem('Compound rewards percentage', `${autoCompoundRewardShares / PPM_TO_PERCENT_DIVISOR} %`),
    // An auto-renewed validation renews itself indefinitely, so who controls it and where its
    // rewards land matter for as long as it runs. All three owner sets are signed here and
    // none of them has to be the signing account.
    ...ownerItems('Validator Owner', signedOwners?.validatorAuthority),
    ...ownerItems('Reward Owner', signedOwners?.rewardOwner),
    ...ownerItems('Delegation Reward Owner', signedOwners?.delegationRewardOwner),
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
