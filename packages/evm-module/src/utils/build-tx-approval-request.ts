import {
  RpcMethod,
  type AgentIdentity,
  type DetailItem,
  type DisplayData,
  type Network,
  type RpcRequest,
  type SigningData,
  type TransactionSimulationResult,
} from '@avalabs/vm-module-types';

import { addressItem, currencyItem, linkItem, networkItem, textItem } from '@internal/utils/src/utils/detail-item';

import { buildAgentIdentityDetailSection } from './build-agent-identity-detail-section';

import { ERC20TransactionType, TransactionKind } from '../types';
import type { TransactionParams } from './transaction-schema';
import { parseERC20TransactionType } from './parse-erc20-transaction-type';
import { getRecipientAddress } from './get-recipient-address';
import { classifyTransaction } from '@src/utils/classify-transaction';
import { parseEercTransaction } from './parse-eerc-transaction';

const parseNativeValue = (value?: string): bigint | null => {
  if (!value) return null;

  try {
    const parsed = BigInt(value);
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
};

export const buildTxApprovalRequest = (
  request: RpcRequest,
  network: Network,
  transaction: TransactionParams,
  { isSimulationSuccessful, balanceChange, tokenApprovals, alert }: TransactionSimulationResult,
  agentIdentity?: AgentIdentity,
  eercDisplayEnabled = false,
) => {
  const { dappInfo } = request;
  const transactionType = parseERC20TransactionType(transaction);

  // generate display and signing data
  let title = 'Do you approve this transaction?';
  if (transactionType === ERC20TransactionType.APPROVE) {
    title = 'Do you approve this spend limit?';
  }

  const recipientAddress = getRecipientAddress(transaction);

  const transactionDetails: DetailItem[] = [
    addressItem('Account', transaction.from),
    networkItem('Network', {
      name: network.chainName,
      logoUri: network.logoUri,
    }),
    linkItem('Website', dappInfo),
  ].filter((item) => !!item);

  const transactionClassification = classifyTransaction(transaction);

  if (transactionClassification !== TransactionKind.CONTRACT_CALL && recipientAddress) {
    transactionDetails.push(addressItem('To', recipientAddress));
  }

  if (
    transaction.to &&
    [TransactionKind.ERC20_TRANSFER, TransactionKind.CONTRACT_CALL].includes(transactionClassification)
  ) {
    transactionDetails.push(addressItem('Contract', transaction.to));
  }

  // The native value is signed, but it otherwise only reaches the user through the
  // simulation's balance change - which is absent whenever the simulation fails.
  const nativeValue = parseNativeValue(transaction.value);

  if (nativeValue) {
    transactionDetails.push(
      currencyItem('Amount', nativeValue, network.networkToken.decimals, network.networkToken.symbol),
    );
  }

  if (eercDisplayEnabled) {
    const eercTransaction = parseEercTransaction(transaction);

    if (eercTransaction) {
      transactionDetails.push(textItem('Operation', eercTransaction.operation));
      transactionDetails.push(textItem('Privacy', 'eERC20'));
    }
  }

  const displayData: DisplayData = {
    title,
    details: [
      {
        title: 'Transaction Details',
        items: transactionDetails,
      },
      ...(agentIdentity ? [buildAgentIdentityDetailSection(agentIdentity)] : []),
    ],
    networkFeeSelector: true,
    alert,
    balanceChange,
    tokenApprovals,
    isSimulationSuccessful,
  };

  const signingData: SigningData = {
    type: RpcMethod.ETH_SEND_TRANSACTION,
    account: transaction.from,
    data: {
      type: 2, // hardcoding to 2 for now as we only support EIP-1559
      nonce: Number(transaction.nonce),
      gasLimit: Number(transaction.gas),
      maxFeePerGas: transaction.maxFeePerGas,
      maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
      to: transaction.to,
      from: transaction.from,
      data: transaction.data,
      value: transaction.value,
      chainId: transaction.chainId ?? network.chainId,
      accessList: transaction.accessList,
    },
  };

  return {
    displayData,
    signingData,
  };
};
