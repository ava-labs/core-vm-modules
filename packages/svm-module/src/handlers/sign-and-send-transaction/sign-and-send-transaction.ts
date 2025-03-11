import { rpcErrors } from '@metamask/rpc-errors';
import {
  RpcMethod,
  type ApprovalController,
  type BalanceChange,
  type DisplayData,
  type Network,
  type RpcRequest,
  type SigningData,
  type SigningResult,
  type SPLToken,
} from '@avalabs/vm-module-types';
import { deserializeTransactionMessage } from '@avalabs/core-wallets-sdk';
import { type Base64EncodedWireTransaction } from '@solana/kit';

import { dataItem } from '@internal/utils/src/utils/detail-item';
import { isFulfilled } from '@internal/utils/src/utils/is-promise-fulfilled';

import { getProvider } from '@src/utils/get-provider';
import { isBalanceChangeEmpty, isNotNullish } from '@src/utils/functional';
import { tryToParseSolTransfer } from '@src/utils/instruction-parsers/sol-transfer';
import { tryToParseSPLTransfer } from '@src/utils/instruction-parsers/spl-transfer';
import { parseRequestParams, type SendOptions } from './schema';

export const signAndSendTransaction = async ({
  request,
  network,
  approvalController,
  proxyApiUrl,
}: {
  request: RpcRequest;
  network: Network;
  approvalController: ApprovalController;
  proxyApiUrl: string;
}) => {
  const { params } = request;
  const { data, success, error } = parseRequestParams(params);

  if (!success) {
    console.error('invalid params', error);
    return {
      error: rpcErrors.invalidParams({ message: 'Transaction params are invalid', data: { cause: error } }),
    };
  }

  const [{ account, serializedTx, sendOptions }] = data;

  const provider = getProvider({
    isTestnet: Boolean(network.isTestnet),
    proxyApiUrl,
  });

  const transaction = await deserializeTransactionMessage(serializedTx, provider);
  const balanceChange: BalanceChange = {
    ins: [],
    outs: [],
  };

  // TODO: simulate transaction with Blockaid. Parsing like below can be used as a fallback.
  const details = await Promise.allSettled(
    transaction.instructions.map(async (instruction) => {
      return (
        tryToParseSolTransfer(instruction, balanceChange, account, network.networkToken) ??
        (await tryToParseSPLTransfer(provider, instruction, balanceChange, account, network.tokens as SPLToken[])) ??
        null
      );
    }),
  ).then((results) =>
    results
      .filter(isFulfilled)
      .map((result) => result.value)
      .filter(isNotNullish),
  );

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
        items: [dataItem('Raw Data', serializedTx)],
      },
      ...details,
    ],
    balanceChange: isBalanceChangeEmpty(balanceChange) ? undefined : balanceChange,
    networkFeeSelector: false,
    isSimulationSuccessful: false,
  };

  const signingData: SigningData = {
    type: RpcMethod.SOLANA_SIGN_AND_SEND_TRANSACTION,
    account,
    data: serializedTx,
  };

  const response = await approvalController.requestApproval({ request, displayData, signingData });

  if ('error' in response) {
    return {
      error: response.error,
    };
  }

  let txHash;

  try {
    txHash = await getTxHash(provider, response, sendOptions);
  } catch (error) {
    console.error(error);
    return {
      error: rpcErrors.internal({ message: 'Unable to get transaction hash', data: { cause: error } }),
    };
  }

  return {
    result: txHash,
  };
};

const getTxHash = async (
  provider: ReturnType<typeof getProvider>,
  response: SigningResult,
  sendOptions?: SendOptions,
) => {
  if ('txHash' in response) {
    return response.txHash;
  }

  // broadcast the signed transaction
  const txHash = await provider
    .sendTransaction(response.signedData as Base64EncodedWireTransaction, {
      ...sendOptions,
      encoding: 'base64',
    })
    .send();
  return txHash;
};
