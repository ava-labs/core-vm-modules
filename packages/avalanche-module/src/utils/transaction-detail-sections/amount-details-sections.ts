import type { DetailItem, DetailSection, TxOutput, TxValueDetails } from '@avalabs/vm-module-types';
import { currencyItem, textItem } from '@internal/utils';
import { AVAX_NONEVM_DENOMINATION } from '../../constants';

const INPUT_AMOUNTS = 'Input amounts';
const OUTPUT_AMOUNTS = 'Output amounts';

type AssetDescription = NonNullable<TxOutput['assetDescription']>;

const _getDescribedAssets = (outputs: TxOutput[]): Map<string, AssetDescription> =>
  outputs.reduce((assets, output) => {
    if (output.assetDescription) {
      assets.set(output.assetId, output.assetDescription);
    }

    return assets;
  }, new Map<string, AssetDescription>());

const _getAmountItem = (
  assetId: string,
  amount: bigint,
  symbol: string,
  avaxAssetId: string | undefined,
  assets: Map<string, AssetDescription>,
): DetailItem => {
  if (assetId === avaxAssetId) {
    return currencyItem(symbol, amount, AVAX_NONEVM_DENOMINATION, symbol);
  }

  const asset = assets.get(assetId);

  if (asset) {
    return currencyItem(asset.name, amount, asset.denomination, asset.symbol);
  }

  return textItem(assetId, amount.toString(), 'vertical');
};

export const amountDetailsSections = (tx: TxValueDetails, symbol: string, avaxAssetId?: string): DetailSection[] => {
  const assets = _getDescribedAssets(tx.outputs);

  const section = (title: string, amounts: Record<string, bigint>): DetailSection[] => {
    const entries = Object.entries(amounts);

    return entries.length === 0
      ? []
      : [
          {
            title,
            items: entries.map(([assetId, amount]) => _getAmountItem(assetId, amount, symbol, avaxAssetId, assets)),
          },
        ];
  };

  return [...section(INPUT_AMOUNTS, tx.inputAmounts), ...section(OUTPUT_AMOUNTS, tx.outputAmounts)];
};
