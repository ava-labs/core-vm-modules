import type { CreateChainTx, DetailItem, DetailSection } from '@avalabs/vm-module-types';
import { currencyItem, textItem } from '@internal/utils';
import { AVAX_NONEVM_DENOMINATION } from '../../constants';

export const blockChainDetailSection = (tx: CreateChainTx, symbol: string) => {
  const details: DetailSection[] = [];
  // handle genesis data similarly to how we handle data in transaction details
  const { txFee, chainID, chainName, vmID, genesisData } = tx;

  const items: DetailItem[] = [
    textItem('Blockchain name', chainName, 'vertical'),
    textItem('Blockchain ID', chainID, 'vertical'),
    textItem('Virtual Machine ID', vmID, 'vertical'),
    textItem('Genesis Data', genesisData, 'vertical'),
  ];

  details.push({
    title: 'Blockchain Details',
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
