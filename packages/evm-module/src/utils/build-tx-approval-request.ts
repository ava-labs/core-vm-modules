import {
  RpcMethod,
  type DetailItem,
  type DisplayData,
  type Network,
  type RpcRequest,
  type SigningData,
  type TransactionSimulationResult,
} from '@avalabs/vm-module-types';

import { addressItem, linkItem, networkItem } from '@internal/utils/src/utils/detail-item';

import { ERC20TransactionType } from '../types';
import type { TransactionParams } from './transaction-schema';
import { parseERC20TransactionType } from './parse-erc20-transaction-type';

export const buildTxApprovalRequest = (
  request: RpcRequest,
  network: Network,
  transaction: TransactionParams,
  { isSimulationSuccessful, balanceChange, tokenApprovals, alert }: TransactionSimulationResult,
  agentIdentity?: DisplayData['agentIdentity'],
) => {
  const { dappInfo } = request;
  const transactionType = parseERC20TransactionType(transaction);

  // generate display and signing data
  let title = 'Do you approve this transaction?';
  if (transactionType === ERC20TransactionType.APPROVE) {
    title = 'Do you approve this spend limit?';
  }

  const transactionDetails: DetailItem[] = [
    addressItem('Account', transaction.from),
    networkItem('Network', {
      name: network.chainName,
      logoUri: network.logoUri,
    }),
    linkItem('Website', dappInfo),
  ];

  if (transaction.to) {
    transactionDetails.push(addressItem('Contract', transaction.to));
  }

  const displayData: DisplayData = {
    title,
    details: [
      {
        title: 'Transaction Details',
        items: transactionDetails,
      },
    ],
    networkFeeSelector: true,
    alert,
    balanceChange,
    tokenApprovals,
    isSimulationSuccessful,
    agentIdentity,
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
