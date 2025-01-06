import {
  RpcMethod,
  type ApprovalController,
  type DisplayData,
  type Network,
  type RpcRequest,
  type SigningData,
} from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';

interface TxPayloadAction {
  actionName: string;
  data: { [key: string]: string }[];
}

const parseDetails = (txPayloadActions: TxPayloadAction[]) => {
  if (!txPayloadActions[0]) {
    return [];
  }
  const name = {
    title: txPayloadActions[0].actionName,
    items: [],
  };
  let data: { title: string; items: string[] | unknown[] }[] = [name];
  for (const [key, value] of Object.entries(txPayloadActions[0].data)) {
    data = [
      ...data,
      {
        title: key,
        items: [value],
      },
    ];
  }
  return data;
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
  const details = parseDetails(request.params[0].tx.actions);
  const displayData = {
    title: 'Sign Message',
    dAppInfo: {
      name: request.dappInfo.name,
      action: `${request.dappInfo.name} requests you to sign the following message`,
      logoUri: request.dappInfo.icon,
    },
    network: {
      chainId: network.chainId,
      name: network.chainName,
      logoUri: network.logoUri,
    },
    details,
  } as unknown as DisplayData;
  const signingData = {
    data: { abi: request.params[0].abi, txPayload: request.params[0].tx },
    type: RpcMethod.HVM_SIGN_TRANSACTION,
  } as unknown as SigningData;
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
