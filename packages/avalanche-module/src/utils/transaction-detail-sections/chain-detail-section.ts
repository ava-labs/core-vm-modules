import type { BaseTx, DetailSection } from '@avalabs/vm-module-types';
import { currencyItem, textItem } from '@internal/utils';
import { AvalancheChainStrings, AVAX_NONEVM_DENOMINATION } from '../../constants';
import { PVM } from '@avalabs/avalanchejs';

export const chainDetailSection = (tx: BaseTx, symbol: string) => {
  const details: DetailSection[] = [];
  const { txFee, chain, memo } = tx;

  details.push({
    title: 'Chain Details',
    items: [textItem('Active chain', `Avalanche ${AvalancheChainStrings[chain]}`)],
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
