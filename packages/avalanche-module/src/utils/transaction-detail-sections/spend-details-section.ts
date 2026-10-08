import type { DetailSection, TxValueDetails } from '@avalabs/vm-module-types';
import type { TransactionSpendDetails } from '../get-transaction-spend-details';
import { assetAmountItem, getDescribedAssets } from './asset-amount-item';

export const spendDetailsSection = (
  tx: TxValueDetails,
  spendDetails: TransactionSpendDetails,
  symbol: string,
  avaxAssetId?: string,
): DetailSection | undefined => {
  const assets = getDescribedAssets(tx.outputs);
  const spent = Object.entries(spendDetails.spentAmounts);

  if (spent.length === 0) {
    return undefined;
  }

  return {
    title: 'You spend',
    items: spent.map(([assetId, amount]) => assetAmountItem(assetId, amount, symbol, avaxAssetId, assets)),
  };
};
