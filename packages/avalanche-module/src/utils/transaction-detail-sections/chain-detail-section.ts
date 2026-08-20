import type { BaseTx, DetailItem, DetailSection } from '@avalabs/vm-module-types';
import { addressItem, currencyItem, textItem } from '@internal/utils';
import { AvalancheChainStrings, AVAX_NONEVM_DENOMINATION } from '../../constants';
import { PVM } from '@avalabs/avalanchejs';

type Output = BaseTx['outputs'][number];

/**
 * Renders the amount in the asset the output actually moves.
 *
 * The X-Chain carries arbitrary Avalanche Native Tokens, and every output was previously
 * labelled with the network token's symbol and denomination - so a transfer of some other
 * asset was shown to the user as if it were AVAX, at AVAX's scale. When the asset is not the
 * network token and the chain did not describe it, the raw amount and the asset id are shown
 * instead of a number that would only look like a familiar unit.
 */
const amountItems = (output: Output, symbol: string): DetailItem[] => {
  if (output.isAvax) {
    return [currencyItem('Amount', output.amount, AVAX_NONEVM_DENOMINATION, symbol)];
  }

  if (output.assetDescription) {
    return [
      currencyItem('Amount', output.amount, output.assetDescription.denomination, output.assetDescription.symbol),
      textItem('Asset', output.assetDescription.name),
    ];
  }

  return [textItem('Amount', `${output.amount} (smallest unit)`), textItem('Asset', output.assetId, 'vertical')];
};

export const chainDetailSection = (tx: BaseTx, symbol: string) => {
  const details: DetailSection[] = [];
  const { txFee, chain, outputs, memo } = tx;

  details.push({
    title: 'Chain Details',
    items: [textItem('Active chain', `Avalanche ${AvalancheChainStrings[chain]}`)],
  });

  outputs.forEach((output, index) => {
    const balanceChangeItems: DetailItem[] = output.owners.flatMap((ownerAddress) => [
      addressItem('To', ownerAddress),
      ...amountItems(output, symbol),
    ]);

    if (output.owners.length > 1) {
      balanceChangeItems.push(textItem('Threshold', output.threshold.toString()));
    }

    // A locked output cannot be spent until its locktime passes, which is not something the
    // amount alone conveys. A locktime already in the past places no restriction on the
    // funds, so it is left out rather than shown as a condition.
    const lockedUntilMs = Number(output.locktime) * 1000;

    if (lockedUntilMs > Date.now()) {
      balanceChangeItems.push(textItem('Locked until', new Date(lockedUntilMs).toUTCString()));
    }

    details.push({
      title: index === 0 ? 'Balance Change' : undefined,
      items: balanceChangeItems,
    });
  });

  if (chain !== PVM && !!memo) {
    details.push({
      title: 'Memo',
      items: [memo],
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
