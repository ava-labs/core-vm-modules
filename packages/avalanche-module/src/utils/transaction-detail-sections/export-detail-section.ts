import type { DetailSection, ExportTx } from '@avalabs/vm-module-types';
import { addressItem, currencyItem, textItem } from '@internal/utils';
import { AvalancheChainStrings, AVAX_NONEVM_DENOMINATION } from '../../constants';

export const exportDetailSection = (tx: ExportTx, symbol: string, recipients: string[] = []) => {
  const details: DetailSection[] = [];
  const { txFee, amount, chain, destination, type } = tx;

  details.push({
    items: [
      textItem('Source Chain', `Avalanche ${AvalancheChainStrings[chain]}`),
      textItem('Target Chain', `Avalanche ${AvalancheChainStrings[destination]}`),
    ],
  });

  details.push({
    items: [
      textItem('Transaction Type', type ? (type[0] || '').toUpperCase() + type.slice(1) : ''),
      currencyItem('Amount', amount, AVAX_NONEVM_DENOMINATION, symbol),
      // Who receives the funds on the target chain is signed but was not shown, so an export
      // paying somebody else looked exactly like one paying the user back.
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
