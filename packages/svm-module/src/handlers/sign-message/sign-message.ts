import { rpcErrors } from '@metamask/rpc-errors';
import {
  RpcMethod,
  type ApprovalController,
  type DisplayData,
  type Network,
  type RpcRequest,
  type SigningData,
} from '@avalabs/vm-module-types';
import { base64 } from '@scure/base';

import { addressItem, dataItem, textItem } from '@internal/utils';

import { parseRequestParams } from './schema';

export const signMessage = async ({
  request,
  network,
  approvalController,
}: {
  request: RpcRequest;
  network: Network;
  approvalController: ApprovalController;
}) => {
  const { params } = request;
  const { data, success, error } = parseRequestParams(params);

  if (!success) {
    console.error('invalid params', error);
    return {
      error: rpcErrors.invalidParams({ message: 'Message signing params are invalid', data: { cause: error } }),
    };
  }

  const [{ account, serializedMessage }] = data;

  const utf8Decoder = new TextDecoder();
  const displayData: DisplayData = {
    title: 'Sign Message',
    network: {
      chainId: network.chainId,
      name: network.chainName,
      logoUri: network.logoUri,
    },
    dAppInfo: {
      name: request.dappInfo.name,
      action: `${request.dappInfo.name} wants you to sign the following message`,
      logoUri: request.dappInfo.icon,
    },
    disclaimer: 'Only confirm if you trust this website',
    details: [
      {
        title: 'Message Details',
        items: [
          addressItem('Account', account),
          textItem('Message', utf8Decoder.decode(base64.decode(serializedMessage))),
          dataItem('Raw Message (Base-64)', serializedMessage),
        ],
      },
    ],
    networkFeeSelector: false,
  };

  const signingData: SigningData = {
    type: RpcMethod.SOLANA_SIGN_MESSAGE,
    account,
    data: serializedMessage,
  };

  const response = await approvalController.requestApproval({ request, displayData, signingData });

  if ('error' in response) {
    return {
      error: response.error,
    };
  }

  if (!('signedData' in response)) {
    return {
      error: rpcErrors.invalidRequest('No signed data returned'),
    };
  }

  return { result: response.signedData };
};
