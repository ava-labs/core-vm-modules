import { rpcErrors } from '@metamask/rpc-errors';
import { avmSerial, Common, pvmSerial } from '@avalabs/avalanchejs';
import { NetworkVMType, TxType, type VM } from '@avalabs/vm-module-types';

// Export txs to C should not contain any non-AVAX assets in their export outputs
export const getUnsupportedExportError = ({
  tx,
  txDetails,
  avaxAssetId,
}: {
  tx: Common.Transaction;
  txDetails: { type: TxType; destination?: VM };
  avaxAssetId: string;
}) => {
  if (txDetails.type !== TxType.Export || txDetails.destination !== NetworkVMType.EVM) {
    return undefined;
  }

  if (!avmSerial.isExportTx(tx) && !pvmSerial.isExportTx(tx)) {
    return rpcErrors.invalidParams('Error while parsing exported outputs');
  }

  return tx.outs.some((output) => output.getAssetId() !== avaxAssetId)
    ? rpcErrors.invalidParams(`Can't export non-AVAX assets to C-Chain`)
    : undefined;
};
