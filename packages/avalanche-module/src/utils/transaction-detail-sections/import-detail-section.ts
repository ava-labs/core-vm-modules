import type { DetailSection, ImportTx } from '@avalabs/vm-module-types';
import { currencyItem, textItem } from '@internal/utils';
import { AvalancheChainStrings, AVAX_NONEVM_DENOMINATION } from '../../constants';

export const importDetailSection = (tx: ImportTx, symbol: string) => {
  const details: DetailSection[] = [];
  const { txFee, amount, chain, source, type } = tx;

  details.push({
    title: 'Transaction Details',
    items: [
      textItem('Source Chain', `Avalanche ${AvalancheChainStrings[source]}`),
      textItem('Destination Chain', `Avalanche ${AvalancheChainStrings[chain]}`),
      textItem('Transaction Type', type ? (type[0] || '').toUpperCase() + type.slice(1) : ''),
      currencyItem('Amount', amount, AVAX_NONEVM_DENOMINATION, symbol),
    ],
  });
  if (txFee) {
    details.push({
      title: 'Network Fee',
      items: [currencyItem('Fee Amount', txFee, AVAX_NONEVM_DENOMINATION, symbol)],
    });
  }
  return details;
};
