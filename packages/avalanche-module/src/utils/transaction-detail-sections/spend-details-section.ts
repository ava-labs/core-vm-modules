import type { DetailSection, TxOutput, TxValueDetails } from '@avalabs/vm-module-types';
import { currencyItem, textItem } from '@internal/utils';
import { AVAX_NONEVM_DENOMINATION } from '../../constants';
import type { TransactionSpendDetails } from '../get-transaction-spend-details';

type AssetDescription = NonNullable<TxOutput['assetDescription']>;

const _getDescribedAssets = (outputs: TxOutput[]): Map<string, AssetDescription> =>
  outputs.reduce((assets, output) => {
    if (output.assetDescription) {
      assets.set(output.assetId, output.assetDescription);
    }

    return assets;
  }, new Map<string, AssetDescription>());

export const spendDetailsSection = (
  tx: TxValueDetails,
  spendDetails: TransactionSpendDetails,
  symbol: string,
  avaxAssetId?: string,
): DetailSection | undefined => {
  const assets = _getDescribedAssets(tx.outputs);
  const spent = Object.entries(spendDetails.spentAmounts);

  if (spent.length === 0) {
    return undefined;
  }

  return {
    title: 'You spend',
    items: spent.map(([assetId, amount]) => {
      if (assetId === avaxAssetId) {
        return currencyItem(symbol, amount, AVAX_NONEVM_DENOMINATION, symbol, true);
      }

      const asset = assets.get(assetId);

      return asset
        ? currencyItem(asset.name, amount, asset.denomination, asset.symbol, false)
        : textItem(assetId, amount.toString(), 'vertical');
    }),
  };
};
