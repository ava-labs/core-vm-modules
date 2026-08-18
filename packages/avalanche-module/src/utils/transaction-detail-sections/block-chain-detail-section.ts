import type { CreateChainTx, DetailItem, DetailSection } from '@avalabs/vm-module-types';
import { currencyItem, dataItem, textItem } from '@internal/utils';
import { AVAX_NONEVM_DENOMINATION } from '../../constants';

const formatGenesisData = (genesisData: string): string => {
  try {
    // Parse and re-stringify with formatting
    const genesisParsed = JSON.parse(genesisData);
    return JSON.stringify(genesisParsed, null, 2);
  } catch (error) {
    // If parsing fails, return original string (don't break approval)
    console.error('Failed to format genesis data:', error);
    return genesisData;
  }
};

export const blockChainDetailSection = (tx: CreateChainTx, symbol: string) => {
  const details: DetailSection[] = [];
  // handle genesis data similarly to how we handle data in transaction details
  const { txFee, chainID, chainName, subnetID, fxIDs, vmID, genesisData } = tx;

  const items: DetailItem[] = [
    textItem('Blockchain name', chainName, 'vertical'),
    textItem('Blockchain ID', chainID, 'vertical'),
    // Which subnet the chain is created under decides who controls it, and the feature
    // extension set decides what its transactions can do. Both are signed here.
    textItem('Subnet ID', subnetID, 'vertical'),
    textItem('Virtual Machine ID', vmID, 'vertical'),
    ...(fxIDs && fxIDs.length > 0 ? [textItem('Feature Extension IDs', fxIDs.join('\n'), 'vertical')] : []),
    dataItem('Genesis Data', formatGenesisData(genesisData)),
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
