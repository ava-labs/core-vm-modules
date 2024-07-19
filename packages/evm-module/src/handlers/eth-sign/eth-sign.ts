import {
  type SigningData,
  type Network,
  type ApprovalController,
  type DisplayData,
  type RpcRequest,
  RpcMethod,
  BannerType,
} from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import { toUtf8String } from 'ethers';
import { beautifySimpleMessage, beautifyComplexMessage } from './utils/beautify-message';
import { parseRequestParams } from './schemas/parse-request-params/parse-request-params';
import { isTypedDataV1 } from './utils/typeguards';
import { isTypedDataValid } from './utils/is-typed-data-valid';

export const ethSign = async ({
  request,
  network,
  approvalController,
}: {
  request: RpcRequest;
  network: Network;
  approvalController: ApprovalController;
}) => {
  const result = parseRequestParams({ method: request.method, params: request.params });

  if (!result.success) {
    console.error('invalid params', result.error);

    return {
      success: false,
      error: rpcErrors.invalidParams('Params are invalid'),
    };
  }
  const { method, data, address } = result.data;

  // validate typed data
  let typedDataValidationResult: ReturnType<typeof isTypedDataValid> | undefined;

  if (method === RpcMethod.SIGN_TYPED_DATA_V3 || method === RpcMethod.SIGN_TYPED_DATA_V4) {
    typedDataValidationResult = isTypedDataValid(data);
  }

  // generate display data and signing data
  let signingData: SigningData | undefined;
  let messageDetails: string | undefined;
  let disclaimer: string | undefined;
  let banner: DisplayData['banner'] | undefined;

  if (typedDataValidationResult && !typedDataValidationResult.isValid) {
    banner = {
      type: BannerType.WARNING,
      title: 'Warning: Verify Message Content',
      description: 'This message contains non-standard elements.',
      detailedDescription: (typedDataValidationResult.error as Error).toString(),
    };
  }

  if (method === RpcMethod.ETH_SIGN) {
    signingData = {
      type: method,
      account: address,
      chainId: network.chainId,
      data: data,
    };

    messageDetails = data;

    disclaimer =
      "Signing this message can be dangerous. This signature could potentially perform any operation on your account's behalf, including granting complete control of your account and all of its assets to the requesting site. Only sign this message if you know what you're doing or completely trust the requesting site";
  } else if (method === RpcMethod.PERSONAL_SIGN) {
    signingData = {
      type: method,
      account: address,
      chainId: network.chainId,
      data: data,
    };

    messageDetails = toUtf8String(data);
  } else if (method === RpcMethod.SIGN_TYPED_DATA || method === RpcMethod.SIGN_TYPED_DATA_V1) {
    signingData = {
      type: method,
      account: address,
      chainId: network.chainId,
      data: data,
    };

    messageDetails = isTypedDataV1(data) ? beautifySimpleMessage(data) : beautifyComplexMessage(data);
  } else if (method === RpcMethod.SIGN_TYPED_DATA_V3 || method === RpcMethod.SIGN_TYPED_DATA_V4) {
    signingData = {
      type: method,
      account: address,
      chainId: network.chainId,
      data: data,
    };

    const { types, primaryType, ...messageToDisplay } = data;
    messageDetails = beautifyComplexMessage(messageToDisplay);
  }

  if (!signingData) {
    return {
      success: false,
      error: rpcErrors.internal('Unable to generate signing data'),
    };
  }

  const displayData: DisplayData = {
    banner,
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
    account: address,
    messageDetails,
    disclaimer,
  };

  // prompt user for approval
  const response = await approvalController.requestApproval({ request, displayData, signingData });

  if ('error' in response) {
    return {
      error: response.error,
    };
  }

  return { result: response.result };
};
