import type { EvmTxUpdateFn, RpcMethod, SigningData } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import { parseERC20TransactionType } from './parse-erc20-transaction-type';

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

      // If `data` update is attempted, verify it's still calling the same function
      // (e.g. it should not be possible to change "approve" to "transfer" mid-request)
      if (data !== oldData.data.data) {
        const oldFunction = parseERC20TransactionType({ data: oldData.data.data ?? undefined });
        const newFunction = parseERC20TransactionType({ data });

        if (oldFunction !== newFunction) {
          throw rpcErrors.invalidInput(
            'Cannot change invoked method while mid-request. Please start a new request instead.',
          );
        }
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
