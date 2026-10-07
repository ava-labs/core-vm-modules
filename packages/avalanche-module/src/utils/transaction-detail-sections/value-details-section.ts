import type { DetailSection, Transfer, TxDetails, TxOutput } from '@avalabs/vm-module-types';
import { transferListItem } from '@internal/utils';

import { AVAX_NONEVM_DENOMINATION } from '../../constants';
import {
  isAddPermissionlessDelegatorTx,
  isAddPermissionlessValidatorTx,
} from '../../handlers/avalanche-send-transaction/typeguards';

const TITLE = 'Transaction Outputs';
const MAX_DATE_SECONDS = 8_640_000_000_000n;

const _toTimestamp = (seconds: bigint): number | 'indefinitely' =>
  seconds > MAX_DATE_SECONDS ? 'indefinitely' : Number(seconds);

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

// no end date for auto-renewed validators
const _getStakeEnd = (tx: TxDetails): Transfer['stakedUntil'] =>
  isAddPermissionlessDelegatorTx(tx) || isAddPermissionlessValidatorTx(tx) ? _toTimestamp(BigInt(tx.end)) : undefined;

const _getStakeDetails = (
  output: TxOutput,
  stakeEnd: Transfer['stakedUntil'],
): Pick<Transfer, 'isStaked' | 'stakedUntil'> => {
  if (!output.isStake) {
    return {};
  }

  return { isStaked: true, stakedUntil: stakeEnd };
};

const _getTransferDetails = (output: TxOutput, symbol: string, stakeEnd: Transfer['stakedUntil']): Transfer => ({
  addresses: output.owners,
  amount: output.amount,
  assetId: output.assetId,
  isNativeToken: output.isAvax,
  ..._getAssetDetails(output, symbol),
  threshold: Number(output.threshold),
  lockedUntil: _toTimestamp(output.locktime),
  stakeableLockedUntil: _toTimestamp(output.stakeableLocktime),
  ..._getStakeDetails(output, stakeEnd),
});

export const valueDetailsSection = (tx: TxDetails, symbol: string): DetailSection | undefined => {
  if (tx.outputs.length === 0) {
    return undefined;
  }

  const stakeEnd = _getStakeEnd(tx);

  return {
    title: TITLE,
    items: [
      transferListItem(
        TITLE,
        tx.outputs.map((output) => _getTransferDetails(output, symbol, stakeEnd)),
      ),
    ],
  };
};
