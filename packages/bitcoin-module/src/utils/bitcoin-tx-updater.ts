import { BitcoinProvider, createTransferTx, type BitcoinInputUTXO } from '@avalabs/core-wallets-sdk';
import type { BtcTxUpdateFn, DisplayData, RpcMethod, SigningData } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import { calculateGasLimit } from './calculate-gas-limit';

type SigningData_BtcSendTx = Extract<SigningData, { type: RpcMethod.BITCOIN_SEND_TRANSACTION }>;

const requests = new Map<string, { signingData: SigningData_BtcSendTx; displayData: DisplayData }>();

export const getTxUpdater = (
  requestId: string,
  signingData: SigningData_BtcSendTx,
  displayData: DisplayData,
  provider: BitcoinProvider,
): { updateTx: BtcTxUpdateFn; cleanup: () => void } => {
  requests.set(requestId, { signingData, displayData });

  return {
    updateTx: ({ feeRate }) => {
      const request = requests.get(requestId);

      if (!request) {
        throw rpcErrors.resourceNotFound();
      }

      const { signingData } = request;

      if (typeof feeRate === 'undefined' || feeRate === signingData.data.feeRate) {
        return request;
      }

      const {
        account,
        data: { to, amount, balance },
      } = signingData;
      const { inputs, outputs, fee } = createTransferTx(
        to,
        account,
        amount,
        feeRate,
        balance.utxos as BitcoinInputUTXO[],
        provider.getNetwork(),
      );

      if (!inputs || !outputs) {
        throw rpcErrors.internal('Unable to create transaction');
      }

      const newData = {
        ...signingData,
        data: {
          ...signingData.data,
          fee,
          feeRate,
          gasLimit: calculateGasLimit(fee, feeRate),
          inputs,
          outputs,
        },
      };

      const updatedRequest = { ...request, signingData: newData };
      requests.set(requestId, updatedRequest);

      return updatedRequest;
    },
    cleanup: () => requests.delete(requestId),
  };
};
