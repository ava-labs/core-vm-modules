import type { BaseTx, DetailItem, DetailSection } from '@avalabs/vm-module-types';
import { addressItem, currencyItem, textItem } from '@internal/utils';
import { AvalancheChainStrings, AVAX_NONEVM_DENOMINATION } from '../../constants';
import { PVM } from '@avalabs/avalanchejs';

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
      currencyItem('Amount', output.amount, AVAX_NONEVM_DENOMINATION, symbol),
    ]);

    if (output.owners.length > 1) {
      balanceChangeItems.push(textItem('Threshold', output.threshold.toString()));
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
