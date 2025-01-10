import { rpcErrors } from '@metamask/rpc-errors';
import type { DisplayData, EvmTxBatchUpdateFn, SigningData_EthSendTx } from '@avalabs/vm-module-types';

type SigningRequests = {
  displayData: DisplayData;
  signingData: SigningData_EthSendTx;
}[];

const requests = new Map<
  string,
  {
    signingRequests: SigningRequests;
    displayData: DisplayData;
  }
>();

export const getTxBatchUpdater = (
  requestId: string,
  signingRequests: SigningRequests,
  displayData: DisplayData,
): { updateTxs: EvmTxBatchUpdateFn; cleanup: () => void } => {
  requests.set(requestId, { signingRequests, displayData });

  return {
    updateTxs: ({ maxFeeRate, maxTipRate }) => {
      const request = requests.get(requestId);

      if (!request) {
        throw rpcErrors.resourceNotFound();
      }

      const { signingRequests } = request;

      const newSigningRequests = signingRequests.map((signingRequest) => {
        const { signingData } = signingRequest;

        const newSigningData = {
          ...signingData,
          data: {
            ...signingData.data,
            maxFeePerGas: maxFeeRate ?? signingData.data.maxFeePerGas,
            maxPriorityFeePerGas: maxTipRate ?? signingData.data.maxPriorityFeePerGas,
          },
        };

        return { signingData: newSigningData, displayData: signingRequest.displayData };
      });

      const updatedRequest = { signingRequests: newSigningRequests, displayData };

      requests.set(requestId, updatedRequest);

      return updatedRequest;
    },
    cleanup: () => requests.delete(requestId),
  };
};
