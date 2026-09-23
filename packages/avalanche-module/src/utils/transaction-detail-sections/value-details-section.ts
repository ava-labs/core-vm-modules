import type { DetailSection, Transfer, TxOutput, TxValueDetails } from '@avalabs/vm-module-types';
import { transferListItem } from '@internal/utils';

import { AVAX_NONEVM_DENOMINATION } from '../../constants';

const TITLE = 'Transaction Outputs';

const _getAssetDetails = (output: TxOutput, symbol: string): Pick<Transfer, 'symbol' | 'decimals' | 'assetName'> => {
  if (output.isAvax) {
    return { symbol, decimals: AVAX_NONEVM_DENOMINATION };
  }

  if (output.assetDescription) {
    return {
      symbol: output.assetDescription.symbol,
      decimals: output.assetDescription.denomination,
      assetName: output.assetDescription.name,
    };
  }

  return {};
};

const _getTransferDetails = (output: TxOutput, symbol: string): Transfer => ({
  addresses: output.owners,
  amount: output.amount,
  assetId: output.assetId,
  ..._getAssetDetails(output, symbol),
  threshold: Number(output.threshold),
  lockedUntil: Number(output.locktime),
  stakeableLockedUntil: Number(output.stakeableLocktime),
});

export const valueDetailsSection = (tx: TxValueDetails, symbol: string): DetailSection | undefined =>
  tx.outputs.length === 0
    ? undefined
    : {
        title: TITLE,
        items: [
          transferListItem(
            TITLE,
            tx.outputs.map((output) => _getTransferDetails(output, symbol)),
          ),
        ],
      };
