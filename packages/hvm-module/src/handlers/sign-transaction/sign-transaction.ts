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
import { currencyItem, rpcErrorOpts } from '@internal/utils';
import { parseRequestParams } from './schema';
import { getProvider } from '../../utils/get-provider';
import { findActionDataMismatches } from '../../utils/check-action-data';
import { getNodeChainId, parseRequestChainId } from '../../utils/get-node-chain-id';
import type { ActionData, VMABI } from 'hypersdk-client';

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

// Check maxFee and timestamp are valid uint64 values
const parseFeeDetails = (maxFee: string, network: Network): DetailSection => ({
  title: 'Network Fee',
  items: [currencyItem('Max Fee', BigInt(maxFee), network.networkToken.decimals, network.networkToken.symbol)],
});

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
      error: rpcErrors.invalidParams(rpcErrorOpts('Transaction params are invalid', result.error)),
    };
  }

  const transaction = result.data[0];
  if (!transaction) {
    return {
      error: rpcErrors.invalidParams(rpcErrorOpts('Transaction params are invalid', new Error('No transaction found'))),
    };
  }

  let abi: VMABI;
  let nodeChainId: bigint;
  try {
    const provider = getProvider(network);
    [abi, nodeChainId] = await Promise.all([provider.getAbi(), getNodeChainId(network)]);
  } catch (err) {
    return {
      error: rpcErrors.internal(rpcErrorOpts('Unable to fetch the chain ABI required to sign the transaction', err)),
    };
  }

  // Ensure that the chainids match
  if (parseRequestChainId(transaction.tx.base.chainId) !== nodeChainId) {
    return {
      error: rpcErrors.invalidParams(
        rpcErrorOpts(
          'Transaction params are invalid',
          new Error(`The transaction targets a different chain than ${network.chainName}`),
        ),
      ),
    };
  }

  // Check that the transaction data matches the ABI
  const actionDataMismatches = findActionDataMismatches(transaction.tx.actions, abi);

  if (actionDataMismatches.length > 0) {
    return {
      error: rpcErrors.invalidParams(
        rpcErrorOpts(
          'Transaction params are invalid',
          new Error(
            `Transaction contains fields that would not be signed as displayed: ${actionDataMismatches.join('; ')}`,
          ),
        ),
      ),
    };
  }

  const details = [...parseDetails(transaction.tx.actions), parseFeeDetails(transaction.tx.base.maxFee, network)];
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
    data: { abi, txPayload: transaction.tx },
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
