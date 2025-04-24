import {
  DetailItemType,
  RpcMethod,
  type ApprovalController,
  type DetailItem,
  type DetailSection,
  type DisplayData,
  type Network,
  type RpcRequest,
  type SigningData,
} from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import { parseRequestParams } from './schema';
import type { ActionData } from 'hypersdk-client';

const parseDetails = (txPayloadActions: ActionData[]): DetailSection[] => {
  if (!txPayloadActions.length) {
    return [];
  }

  return txPayloadActions.map((action) => {
    return {
      title: action.actionName,
      items: [
        ...Object.entries(action.data).map(([key, value]): DetailItem => {
          const addressRegex = /^0x[0-9a-f]{74}$/i;

          if (typeof value === 'string' && addressRegex.test(value)) {
            return {
              label: key,
              type: DetailItemType.ADDRESS,
              value: value,
            };
          }

          return {
            label: key,
            type: DetailItemType.TEXT,
            value: typeof value === 'string' ? value : JSON.stringify(value),
            alignment: 'vertical',
          };
        }),
      ],
    };
  });
};

export const hvmSign = async ({
  request,
  network,
  approvalController,
}: {
  request: RpcRequest;
  network: Network;
  approvalController: ApprovalController;
}) => {
  const { params } = request;

  // validate params
  const result = parseRequestParams(params);
  if (!result.success) {
    return {
      error: rpcErrors.invalidParams({
        message: 'Transaction params are invalid',
        data: { cause: result.error.format() },
      }),
    };
  }

  const transaction = result.data[0];
  if (!transaction) {
    return {
      error: rpcErrors.invalidParams({
        message: 'Transaction params are invalid',
        data: { cause: 'No transaction found' },
      }),
    };
  }

  const details = parseDetails(transaction.tx.actions);
  const displayData: DisplayData = {
    title: 'Do you approve this transaction?',
    dAppInfo: {
      name: request.dappInfo.name,
      action: `${request.dappInfo.name} is requesting to sign the following message`,
      logoUri: request.dappInfo.icon,
    },
    network: {
      chainId: network.chainId,
      name: network.chainName,
      logoUri: network.logoUri,
    },
    details,
  };
  const signingData: SigningData = {
    type: RpcMethod.HVM_SIGN_TRANSACTION,
    data: { abi: transaction.abi, txPayload: transaction.tx },
  };
  const response = await approvalController.requestApproval({ request, displayData, signingData });
  if ('error' in response) {
    return {
      error: response.error,
    };
  }

  if (!('signedData' in response)) {
    return {
      error: rpcErrors.internal('No signed data returned'),
    };
  }

  return { result: response.signedData };
};
