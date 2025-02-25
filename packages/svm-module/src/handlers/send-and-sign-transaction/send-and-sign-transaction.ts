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
} from '@avalabs/vm-module-types';
import { TokenUnit } from '@avalabs/core-utils-sdk';
import { deserializeTransactionMessage } from '@avalabs/core-wallets-sdk';
import { isInstructionWithAccounts, isInstructionWithData, type Base64EncodedWireTransaction } from '@solana/web3.js';
import { identifySystemInstruction, parseTransferSolInstruction, SystemInstruction } from '@solana-program/system';

import { addressItem, dataItem, textItem } from '@internal/utils/src/utils/detail-item';

import { getProvider } from '@src/utils/get-provider';
import { isEmpty } from '@src/utils/is-empty';
import { parseRequestParams } from './schema';

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
  const details = transaction.instructions
    .map((instruction) => {
      if (isInstructionWithAccounts(instruction) && isInstructionWithData(instruction)) {
        const systemInstruction = identifySystemInstruction(instruction);

        if (systemInstruction === SystemInstruction.TransferSol) {
          const { accounts, data } = parseTransferSolInstruction(instruction);

          const isOutgoing = accounts.source.address === account;
          const balanceChangeKey = isOutgoing === true ? 'outs' : 'ins';
          if (isOutgoing) {
            balanceChange[balanceChangeKey].push({
              token: {
                ...network.networkToken,
                address: '',
              },
              items: [
                {
                  displayValue: new TokenUnit(data.amount, network.networkToken.decimals, '').toString(),
                  usdPrice: undefined,
                },
              ],
            });
          }
          return {
            title: 'Native Transfer',
            items: [
              addressItem('From', accounts.source.address),
              addressItem('To', accounts.destination.address),
              textItem('Type', 'Native transfer'),
            ],
          };
        }
      }
    })
    .filter(<D>(detail: D | undefined): detail is D => detail !== undefined);

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
    balanceChange: isEmpty(balanceChange) ? undefined : balanceChange,
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
    txHash = await getTxHash(provider, response);
  } catch (error) {
    return {
      error: rpcErrors.internal({ message: 'Unable to get transaction hash', data: { cause: error } }),
    };
  }

  return {
    result: txHash,
  };
};

const getTxHash = async (provider: ReturnType<typeof getProvider>, response: SigningResult) => {
  if ('txHash' in response) {
    return response.txHash;
  }

  // broadcast the signed transaction
  const txHash = await provider
    .sendTransaction(response.signedData as Base64EncodedWireTransaction, {
      encoding: 'base64',
    })
    .send();
  return txHash;
};
