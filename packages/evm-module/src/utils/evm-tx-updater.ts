import type { EvmTxUpdateFn, RpcMethod, SigningData } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';

type SigningData_EthSendTx = Extract<SigningData, { type: RpcMethod.ETH_SEND_TRANSACTION }>;

const requests = new Map<string, SigningData_EthSendTx>();

export const getTxUpdater = (
  requestId: string,
  signingData: SigningData_EthSendTx,
): { updateTx: EvmTxUpdateFn; cleanup: () => void } => {
  requests.set(requestId, signingData);

  return {
    updateTx: ({ maxFeeRate, maxTipRate, data }) => {
      const oldData = requests.get(requestId);

      if (!oldData) {
        throw rpcErrors.resourceNotFound();
      }

      const newData = {
        ...oldData,
        data: {
          ...oldData.data,
          data: data ?? oldData.data.data,
          maxFeePerGas: maxFeeRate ?? oldData.data.maxFeePerGas,
          maxPriorityFeePerGas: maxTipRate ?? oldData.data.maxPriorityFeePerGas,
        },
      };

      requests.set(requestId, newData);

      return newData;
    },
    cleanup: () => requests.delete(requestId),
  };
};
