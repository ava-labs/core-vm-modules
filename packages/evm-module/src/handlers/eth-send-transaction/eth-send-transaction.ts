import type { Chain, Hex, RpcRequest } from '@avalabs/vm-module-types';
import { parseRequestParams } from './schema';
import type { ApprovalController, DisplayData, ProviderParams, SigningData } from '../../types';
import { estimateGasLimit } from '../../utils/estimate-gas-limit';
import { getNonce } from '../../utils/get-nonce';
import { rpcErrors } from '@metamask/rpc-errors';
import { getClientForChain } from '../../utils/get-client-for-chain';
import type { PublicClient } from 'viem';
import { DerivationPath } from '@avalabs/wallets-sdk';

export const ethSendTransaction = async ({
  request,
  chain,
  approvalController,
  glacierApiKey,
}: {
  request: RpcRequest;
  chain: Chain;
  approvalController: ApprovalController;
  transactionValidation: boolean;
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

  const providerParams: ProviderParams = {
    glacierApiKey,
    chainId,
    chainName: chain.chainName ?? '',
    rpcUrl: chain.rpcUrl ?? '',
    multiContractAddress: chain.multiContractAddress,
  };

  // calculate gas limit if not provided/invalid
  if (!transaction.gas || Number(transaction.gas) < 0) {
    try {
      const gasLimit = await estimateGasLimit({
        providerParams,
        transactionParams: {
          from: transaction.from,
          to: transaction.to,
          data: transaction.data,
          value: transaction.value,
        },
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
        providerParams,
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
  let transactionValidationResult, transactionSimulationResult;

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
    transactionValidation: transactionValidationResult,
    transactionSimulation: transactionSimulationResult,
  };

  const typeFromPayload = transaction.maxFeePerGas ? 2 : 0;

  /**
   * We use EIP-1559 market fees (maxFeePerGas/maxPriorityFeePerGas),
   * and they require `type` to be set accordingly (to a value of 2).
   *
   * If the transaction payload explicitly sets a higher `type`,
   * we won't change it hoping it's still backwards-compatible.
   *
   * At the moment of writing this comment, "2" is the highest tx type available.
   */
  const typeToSign = Math.max(typeFromPayload, 2);

  const signingData: SigningData = {
    type: 'transaction',
    account: transaction.from,
    chainId,
    derivationPath: DerivationPath.BIP44,
    data: {
      type: typeToSign,
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
  const client = getClientForChain({ chain });
  const txHash = await client.sendRawTransaction({ serializedTransaction: response.result });

  waitForTransactionReceipt({
    client,
    txHash,
    onTransactionConfirmed: approvalController.onTransactionConfirmed,
    onTransactionReverted: approvalController.onTransactionReverted,
  });

  return { result: txHash };
};

const waitForTransactionReceipt = async ({
  client,
  txHash,
  onTransactionConfirmed,
  onTransactionReverted,
}: {
  client: PublicClient;
  txHash: Hex;
  onTransactionConfirmed: (txHash: Hex) => void;
  onTransactionReverted: (txHash: Hex) => void;
}) => {
  const receipt = await client.waitForTransactionReceipt({ hash: txHash, pollingInterval: 1_000 });
  const success = receipt?.status === 'success';

  if (success) {
    onTransactionConfirmed(txHash);
  } else {
    onTransactionReverted(txHash);
  }
};
