import type { ApprovalController, DisplayData, Network, RpcRequest, SigningData } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';

export const hvmSign = async ({
  request,
  network,
  approvalController,
}: {
  request: RpcRequest;
  network: Network;
  approvalController: ApprovalController;
}) => {
  // eslint-disable-next-line no-console
  console.log('hvmSignMessage: ');
  // eslint-disable-next-line no-console
  console.log('network: ', network);
  // eslint-disable-next-line no-console
  console.log('request: ', request);
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
  } as unknown as DisplayData;
  const signingData = {} as unknown as SigningData;
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
