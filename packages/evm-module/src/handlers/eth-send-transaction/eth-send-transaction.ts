import {
  type Network,
  type Hex,
  type RpcRequest,
  type ApprovalController,
  type DisplayData,
  type SigningData,
  RpcMethod,
  type SigningResult,
  type DetailItem,
  type DetailSection,
} from '@avalabs/vm-module-types';
import { parseRequestParams } from './schema';
import { estimateGasLimit } from '../../utils/estimate-gas-limit';
import { getNonce } from '../../utils/get-nonce';
import { rpcErrors } from '@metamask/rpc-errors';
import { getProvider } from '../../utils/get-provider';
import type { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';
import { processTransactionSimulation } from '../../utils/process-transaction-simulation';
import { parseERC20TransactionType } from '../../utils/parse-erc20-transaction-type';
import { ERC20TransactionType } from '../../types';
import { addressItem, textItem, dataItem } from '@internal/utils';

export const ethSendTransaction = async ({
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
  const { dappInfo, params } = request;

  // validate params
  const result = parseRequestParams(params);

  if (!result.success) {
    console.error('invalid params', result.error);
    return {
      error: rpcErrors.invalidParams({ message: 'Transaction params are invalid', data: { cause: result.error } }),
    };
  }

  const transaction = result.data[0];

  if (!transaction) {
    return {
      error: rpcErrors.invalidParams({ message: 'Transaction params are invalid', data: { cause: result.error } }),
    };
  }

  const provider = getProvider({
    chainId: network.chainId,
    chainName: network.chainName,
    rpcUrl: network.rpcUrl,
    multiContractAddress: network.utilityAddresses?.multicall,
    pollingInterval: 1000,
  });

  // calculate gas limit if not provided/invalid
  if (!transaction.gas || Number(transaction.gas) < 0) {
    try {
      const gasLimit = await estimateGasLimit({
        transactionParams: {
          from: transaction.from,
          to: transaction.to,
          data: transaction.data,
          value: transaction.value,
        },
        provider,
      });

      transaction.gas = '0x' + gasLimit.toString(16);
    } catch (error) {
      return {
        error: rpcErrors.internal('Unable to calculate gas limit'),
      };
    }
  }

  // calculate nonce if not provided
  if (!transaction.nonce) {
    try {
      const nonce = await getNonce({
        from: transaction.from,
        provider,
      });
      transaction.nonce = String(nonce);
    } catch (error) {
      return {
        error: rpcErrors.internal('Unable to calculate nonce'),
      };
    }
  }

  const transactionType = parseERC20TransactionType(transaction);

  const { alert, balanceChange, tokenApprovals } = await processTransactionSimulation({
    request,
    proxyApiUrl,
    chainId: network.chainId,
    params: transaction,
    dAppUrl: request.dappInfo.url,
  });

  // generate display and signing data
  let title = 'Approve Transaction';
  if (transactionType === ERC20TransactionType.APPROVE) {
    title = 'Token Spend Approval';
  }

  const transactionDetails: DetailItem[] = [
    textItem('Website', new URL(dappInfo.url).hostname),
    addressItem('From', transaction.from),
    addressItem('To', transaction.to),
  ];

  if (transactionType) {
    transactionDetails.push(textItem('Type', transactionType as string));
  }

  if (transaction.data) {
    transactionDetails.push(dataItem('Data', transaction.data));
  }

  const details: DetailSection[] = [
    {
      title: 'Transaction Details',
      items: transactionDetails,
    },
  ];

  const displayData: DisplayData = {
    title,
    network: {
      chainId: network.chainId,
      name: network.chainName,
      logoUri: network.logoUri,
    },
    details,
    networkFeeSelector: true,
    alert,
    balanceChange,
    tokenApprovals,
  };

  const signingData: SigningData = {
    type: RpcMethod.ETH_SEND_TRANSACTION,
    account: transaction.from,
    data: {
      type: 2, // hardcoding to 2 for now as we only support EIP-1559
      nonce: Number(transaction.nonce),
      gasLimit: Number(transaction.gas),
      to: transaction.to,
      from: transaction.from,
      data: transaction.data,
      value: transaction.value,
      chainId: transaction.chainId,
    },
  };

  // prompt user for approval
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
    txHash,
    onTransactionConfirmed: approvalController.onTransactionConfirmed,
    onTransactionReverted: approvalController.onTransactionReverted,
  });

  return { result: txHash };
};

const getTxHash = async (provider: JsonRpcBatchInternal, response: SigningResult) => {
  if ('txHash' in response) {
    return response.txHash;
  }

  // broadcast the signed transaction
  const txHash = await provider.send('eth_sendRawTransaction', [response.signedData]);
  return txHash;
};

const waitForTransactionReceipt = async ({
  provider,
  txHash,
  onTransactionConfirmed,
  onTransactionReverted,
}: {
  provider: JsonRpcBatchInternal;
  txHash: Hex;
  onTransactionConfirmed: (txHash: Hex) => void;
  onTransactionReverted: (txHash: Hex) => void;
}) => {
  try {
    const receipt = await provider.waitForTransaction(txHash);

    const success = receipt?.status === 1; // 1 indicates success, 0 indicates revert

    if (success) {
      onTransactionConfirmed(txHash);
    } else {
      onTransactionReverted(txHash);
    }
  } catch (error) {
    console.error(error);
    onTransactionReverted(txHash);
  }
};
