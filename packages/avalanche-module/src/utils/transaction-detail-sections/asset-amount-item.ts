import type { DetailItem, TxOutput } from '@avalabs/vm-module-types';
import { currencyItem, textItem } from '@internal/utils';
import { AVAX_NONEVM_DENOMINATION } from '../../constants';

type AssetDescription = NonNullable<TxOutput['assetDescription']>;

export const getDescribedAssets = (outputs: TxOutput[]): Map<string, AssetDescription> =>
  outputs.reduce((assets, output) => {
    if (output.assetDescription) {
      assets.set(output.assetId, output.assetDescription);
    }

    return assets;
  }, new Map<string, AssetDescription>());

export const assetAmountItem = (
  assetId: string,
  amount: bigint,
  symbol: string,
  avaxAssetId: string | undefined,
  assets: Map<string, AssetDescription>,
): DetailItem => {
  if (assetId === avaxAssetId) {
    return { ...currencyItem(symbol, amount, AVAX_NONEVM_DENOMINATION, symbol, true), isAssetLabel: true };
  }

  const asset = assets.get(assetId);

  if (asset) {
    return { ...currencyItem(asset.name, amount, asset.denomination, asset.symbol, false), isAssetLabel: true };
  }

  return textItem(assetId, amount.toString(), 'vertical');
};
