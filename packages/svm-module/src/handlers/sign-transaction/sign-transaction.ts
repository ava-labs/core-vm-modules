import { rpcErrors } from '@metamask/rpc-errors';
import {
  RpcMethod,
  type ApprovalController,
  type BalanceChange,
  type DisplayData,
  type Network,
  type RpcRequest,
  type SigningData,
  type SPLToken,
} from '@avalabs/vm-module-types';
import { deserializeTransactionMessage } from '@avalabs/core-wallets-sdk';

import { dataItem } from '@internal/utils/src/utils/detail-item';

import { getProvider } from '@src/utils/get-provider';
import { isEmpty } from '@src/utils/is-empty';
import { parseRequestParams } from './schema';
import { tryToParseSolTransfer } from '@src/utils/instruction-parsers/sol-transfer';
import { tryToParseSPLTransfer } from '@src/utils/instruction-parsers/spl-transfer';
import { isFulfilled } from '@internal/utils/src/utils/is-promise-fulfilled';

export const signTransaction = async ({
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

  const [{ account, serializedTx }] = data;

  const provider = getProvider({
    isTestnet: Boolean(network.isTestnet),
    proxyApiUrl,
  });

  const transaction = deserializeTransactionMessage(serializedTx);
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
      .filter(<D>(detail: D | undefined | null): detail is D => detail != null),
  );

  const displayData: DisplayData = {
    title: 'Sign Transaction',
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
    balanceChange: isEmpty(balanceChange) ? undefined : balanceChange,
    networkFeeSelector: false,
    isSimulationSuccessful: false,
  };

  const signingData: SigningData = {
    type: RpcMethod.SOLANA_SIGN_TRANSACTION,
    account,
    data: serializedTx,
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
