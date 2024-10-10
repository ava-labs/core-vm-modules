import {
  RpcMethod,
  type ApprovalController,
  type DisplayData,
  type Hex,
  type Network,
  type RpcRequest,
  type SigningData,
} from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import type { BitcoinProvider, BitcoinInputUTXO, BitcoinOutputUTXO } from '@avalabs/core-wallets-sdk';

import { addressItem, currencyItem } from '@internal/utils';
import { fundsRecipientItem, linkItem } from '@internal/utils/src/utils/detail-item';

import { getProvider } from '../../utils/get-provider';
import { waitForTransactionReceipt } from '../../utils/wait-for-tx-receipt';
import { getTxHash } from '../../utils/get-tx-hash';
import { parseRequestParams, type BitcoinSignTransactionParams } from './schema';

type BitcoinSignTransactionRequestParams = {
  request: RpcRequest;
  network: Network;
  approvalController: ApprovalController;
  proxyApiUrl: string;
};

export const bitcoinSignTransaction = async ({
  request,
  network,
  approvalController,
  proxyApiUrl,
}: BitcoinSignTransactionRequestParams) => {
  const { dappInfo, params: rawParams } = request;
  const { success, data: params, error: parseError } = parseRequestParams(rawParams);

  if (!success) {
    console.error('invalid params', parseError);
    return {
      error: rpcErrors.invalidParams({ message: 'Transaction params are invalid', data: { cause: parseError } }),
    };
  }

  const provider = getProvider({
    isTestnet: Boolean(network.isTestnet),
    proxyApiUrl,
  });

  const { fee, fromAddress, outputs } = await parseTxDetails(params, provider);
  const { decimals, symbol } = network.networkToken;

  const displayData: DisplayData = {
    title: 'Approve Transaction',
    network: {
      chainId: network.chainId,
      name: network.chainName,
      logoUri: network.logoUri,
    },
    details: [
      {
        title: 'Transaction Details',
        items: [
          linkItem('Website', dappInfo),
          addressItem('From', fromAddress),
          currencyItem('Fee', BigInt(fee), decimals, symbol),
        ],
      },
      {
        title: 'Recipients',
        items: outputs.map(({ address, value }) => fundsRecipientItem(address, BigInt(value), decimals, symbol)),
      },
    ],
    networkFeeSelector: false,
  };

  const signingData: SigningData = {
    type: RpcMethod.BITCOIN_SIGN_TRANSACTION,
    account: fromAddress,
    data: {
      inputs: params.inputs,
      outputs: params.outputs,
    },
  };

  const response = await approvalController.requestApproval({ request, displayData, signingData });

  if ('error' in response) {
    return {
      error: response.error,
    };
  }

  let txHash;

  try {
    txHash = await getTxHash(provider, response);
  } catch (error) {
    return {
      error: rpcErrors.internal({ message: 'Unable to get transaction hash', data: { cause: error } }),
    };
  }

  waitForTransactionReceipt({
    provider,
    txHash: txHash as Hex,
    onTransactionConfirmed: approvalController.onTransactionConfirmed,
    onTransactionReverted: approvalController.onTransactionReverted,
    // Pass the requestId so that client apps can pair the transaction
    // status changes back to their respective requests for better tracking.
    requestId: request.requestId,
  });

  return {
    result: txHash,
  };
};

const getScript = (inputs: BitcoinInputUTXO[]): string => {
  const scripts = Array.from(new Set(inputs.map(({ script }) => script)));

  if (scripts.length !== 1) {
    throw rpcErrors.invalidParams({
      message: `All input UTXOs must belong to a single address, found ${scripts.length}`,
    });
  }

  return scripts[0]!;
};

const parseTxDetails = async (
  params: BitcoinSignTransactionParams,
  provider: BitcoinProvider,
): Promise<{
  fromAddress: string;
  outputs: [BitcoinOutputUTXO, ...BitcoinOutputUTXO[]];
  fee: number;
}> => {
  const script = getScript(params.inputs);
  const fromAddress = await provider.getAddressFromScript(script);
  const outputs = params.outputs.filter(({ address }) => address !== fromAddress);
  const inputsTotal = params.inputs.reduce((sum, { value }) => sum + value, 0);
  const outputsTotal = params.outputs.reduce((sum, { value }) => sum + value, 0);
  const fee = inputsTotal - outputsTotal;

  assertNonEmpty(outputs);

  return {
    fromAddress,
    outputs,
    fee,
  };
};

function assertNonEmpty<T>(array: T[]): asserts array is [T, ...T[]] {
  if (array.length < 1) {
    throw rpcErrors.invalidParams({
      message: 'No actual output is provided, this transaction would only burn funds',
    });
  }
}
