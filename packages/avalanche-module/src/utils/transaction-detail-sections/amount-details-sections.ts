import type { DetailSection, TxValueDetails } from '@avalabs/vm-module-types';
import { assetAmountItem, getDescribedAssets } from './asset-amount-item';

const INPUT_AMOUNTS = 'Input amounts';
const OUTPUT_AMOUNTS = 'Output amounts';

export const amountDetailsSections = (tx: TxValueDetails, symbol: string, avaxAssetId?: string): DetailSection[] => {
  const assets = getDescribedAssets(tx.outputs);

  const section = (title: string, amounts: Record<string, bigint>): DetailSection[] => {
    const entries = Object.entries(amounts);

    return entries.length === 0
      ? []
      : [
          {
            title,
            items: entries.map(([assetId, amount]) => assetAmountItem(assetId, amount, symbol, avaxAssetId, assets)),
          },
        ];
  };

  return [...section(INPUT_AMOUNTS, tx.inputAmounts), ...section(OUTPUT_AMOUNTS, tx.outputAmounts)];
};
