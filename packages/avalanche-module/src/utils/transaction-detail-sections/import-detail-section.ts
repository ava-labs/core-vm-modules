import type { DetailSection, ImportTx } from '@avalabs/vm-module-types';
import { addressItem, currencyItem, textItem } from '@internal/utils';
import { AvalancheChainStrings, AVAX_NONEVM_DENOMINATION } from '../../constants';

export const importDetailSection = (tx: ImportTx, symbol: string, recipients: string[] = []) => {
  const details: DetailSection[] = [];
  const { txFee, amount, chain, source, type } = tx;
  details.push({
    items: [
      textItem('Source Chain', `Avalanche ${AvalancheChainStrings[source]}`),
      textItem('Destination Chain', `Avalanche ${AvalancheChainStrings[chain]}`),
    ],
  });

  details.push({
    items: [
      textItem('Transaction Type', type ? (type[0] || '').toUpperCase() + type.slice(1) : ''),
      currencyItem('Amount', amount, AVAX_NONEVM_DENOMINATION, symbol),
      // Who receives the imported funds is signed but was not shown.
      ...recipients.map((recipient) => addressItem('To', recipient)),
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
