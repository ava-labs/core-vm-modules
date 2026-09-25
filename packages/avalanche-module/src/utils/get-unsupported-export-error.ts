import { rpcErrors } from '@metamask/rpc-errors';
import { avmSerial, Common, evmSerial, pvmSerial, type TransferableOutput } from '@avalabs/avalanchejs';
import { NetworkVMType, TxType, type VM } from '@avalabs/vm-module-types';

export const EXPORT_PARSE_ERROR = 'Error while parsing exported outputs';
export const INVALID_EXPORT_ERROR = 'Only AVAX can be exported';

const _hasNonAvaxOutput = (outputs: readonly TransferableOutput[], avaxAssetId: string) =>
  outputs.some((output) => output.getAssetId() !== avaxAssetId);

export const getUnsupportedExportError = ({
  tx,
  txDetails,
  avaxAssetId,
}: {
  tx: Common.Transaction;
  txDetails: { type: TxType; chain?: VM; destination?: VM };
  avaxAssetId: string;
}) => {
  if (txDetails.type !== TxType.Export) {
    return undefined;
  }

  if (txDetails.destination === NetworkVMType.EVM) {
    if (!avmSerial.isExportTx(tx) && !pvmSerial.isExportTx(tx)) {
      return rpcErrors.invalidParams(EXPORT_PARSE_ERROR);
    }

    return _hasNonAvaxOutput(tx.outs, avaxAssetId) ? rpcErrors.invalidParams(INVALID_EXPORT_ERROR) : undefined;
  }

  if (txDetails.chain === NetworkVMType.EVM) {
    if (!evmSerial.isExportTx(tx)) {
      return rpcErrors.invalidParams(EXPORT_PARSE_ERROR);
    }

    return _hasNonAvaxOutput(tx.exportedOutputs, avaxAssetId)
      ? rpcErrors.invalidParams(INVALID_EXPORT_ERROR)
      : undefined;
  }

  return undefined;
};
