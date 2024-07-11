import {
  type Chain,
  type Hex,
  type RpcRequest,
  type ApprovalController,
  type DisplayData,
  type SigningData,
  SigningDataType,
} from '@avalabs/vm-module-types';
import { parseRequestParams } from './schema';
import { estimateGasLimit } from '../../utils/estimate-gas-limit';
import { getNonce } from '../../utils/get-nonce';
import { rpcErrors } from '@metamask/rpc-errors';
import { getProvider } from '../../utils/get-provider';
import type { JsonRpcBatchInternal } from '@avalabs/wallets-sdk';

export const ethSendTransaction = async ({
  request,
  chain,
  approvalController,
  glacierApiKey,
}: {
  request: RpcRequest;
  chain: Chain;
  approvalController: ApprovalController;
  glacierApiKey?: string;
}) => {
  const { chainId, dappInfo, params } = request;

  // validate params
  const result = parseRequestParams(params);

  if (!result.success) {
    console.error(result.error);
    return {
      error: rpcErrors.invalidParams('Transaction params are invalid'),
    };
  }

  const transaction = result.data[0];

  if (!transaction) {
    return {
      error: rpcErrors.invalidParams('Transaction params are invalid'),
    };
  }

  const provider = getProvider({
    glacierApiKey,
    chainId,
    chainName: chain.chainName ?? '',
    rpcUrl: chain.rpcUrl ?? '',
    multiContractAddress: chain.multiContractAddress,
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

  // TODO: validate + simulate transaction
  // https://ava-labs.atlassian.net/browse/CP-8870

  // generate display and signing data
  // TODO adjust title for different transaction types
  // https://ava-labs.atlassian.net/browse/CP-8870
  const displayData: DisplayData = {
    title: 'Approve Transaction',
    chain: {
      chainId: chain.chainId,
      name: chain.chainName,
      logoUrl: chain.logoUrl,
    },
    transactionDetails: {
      website: new URL(dappInfo.url).hostname,
      from: transaction.from,
      to: transaction.to,
      data: transaction.data,
    },
    networkFeeSelector: true,
  };

  const signingData: SigningData = {
    type: SigningDataType.EVM_TRANSACTION,
    account: transaction.from,
    chainId,
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

  // broadcast the signed transaction
  const txHash = await provider.send('eth_sendRawTransaction', [response.result]);

  waitForTransactionReceipt({
    provider,
    txHash,
    onTransactionConfirmed: approvalController.onTransactionConfirmed,
    onTransactionReverted: approvalController.onTransactionReverted,
  });

  return { result: txHash };
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
  const receipt = await provider.waitForTransaction(txHash);

  const success = receipt?.status === 1; // 1 indicates success, 0 indicates revert

  if (success) {
    onTransactionConfirmed(txHash);
  } else {
    onTransactionReverted(txHash);
  }
};
