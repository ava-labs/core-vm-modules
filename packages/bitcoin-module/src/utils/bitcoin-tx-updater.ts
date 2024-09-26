import { BitcoinProvider, createTransferTx, type BitcoinInputUTXO } from '@avalabs/core-wallets-sdk';
import type { BtcTxUpdateFn, RpcMethod, SigningData } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import { calculateGasLimit } from './calculate-gas-limit';

type SigningData_BtcSendTx = Extract<SigningData, { type: RpcMethod.BITCOIN_SEND_TRANSACTION }>;

const requests = new Map<string, SigningData_BtcSendTx>();

export const getTxUpdater = (
  requestId: string,
  signingData: SigningData_BtcSendTx,
  provider: BitcoinProvider,
): { updateTx: BtcTxUpdateFn; cleanup: () => void } => {
  requests.set(requestId, signingData);

  return {
    updateTx: ({ feeRate }) => {
      const oldData = requests.get(requestId);

      if (!oldData) {
        throw rpcErrors.resourceNotFound();
      }

      if (typeof feeRate === 'undefined' || feeRate === oldData.data.feeRate) {
        return oldData;
      }

      const {
        account,
        data: { to, amount, balance },
      } = oldData;
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
        ...oldData,
        data: {
          ...oldData.data,
          fee,
          feeRate,
          gasLimit: calculateGasLimit(fee, feeRate),
          inputs,
          outputs,
        },
      };

      requests.set(requestId, newData);

      return newData;
    },
    cleanup: () => requests.delete(requestId),
  };
};
