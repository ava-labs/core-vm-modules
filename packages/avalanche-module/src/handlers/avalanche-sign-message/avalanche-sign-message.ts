import {
  type SigningData,
  type Network,
  type ApprovalController,
  type DisplayData,
  type RpcRequest,
  RpcMethod,
} from '@avalabs/vm-module-types';
import { parseRequestParams } from './schemas/parse-request-params/parse-request-params';
import { rpcErrors } from '@metamask/rpc-errors';

export const avalancheSignMessage = async ({
  request,
  network,
  approvalController,
}: {
  request: RpcRequest;
  network: Network;
  approvalController: ApprovalController;
}) => {
  const result = parseRequestParams(request.params);

  if (!result.success) {
    console.error('invalid params', result.error);

    return {
      error: rpcErrors.invalidParams({ message: 'Params are invalid', data: { cause: result.error } }),
    };
  }
  const [message, accountIndex] = result.data;
  const msgHex = Buffer.from(message, 'utf-8').toString('hex');
  const signingData: SigningData = {
    type: RpcMethod.AVALANCHE_SIGN_MESSAGE,
    data: msgHex,
    accountIndex,
  };

  const displayData: DisplayData = {
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
    details: [
      {
        title: 'Message',
        items: [message],
      },
    ],
  };

  // prompt user for approval
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
