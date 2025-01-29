import {
  RpcMethod,
  type DetailItem,
  type DisplayData,
  type Network,
  type RpcRequest,
  type SigningData,
  type TransactionSimulationResult,
} from '@avalabs/vm-module-types';

import { addressItem, dataItem, linkItem, textItem } from '@internal/utils/src/utils/detail-item';

import { ERC20TransactionType } from '../types';
import type { TransactionParams } from './transaction-schema';
import { parseERC20TransactionType } from './parse-erc20-transaction-type';

export const buildTxApprovalRequest = (
  request: RpcRequest,
  network: Network,
  transaction: TransactionParams,
  { isSimulationSuccessful, balanceChange, tokenApprovals, alert }: TransactionSimulationResult,
) => {
  const { dappInfo } = request;
  const transactionType = parseERC20TransactionType(transaction);

  // generate display and signing data
  let title = 'Approve Transaction';
  if (transactionType === ERC20TransactionType.APPROVE) {
    title = 'Token Spend Approval';
  }

  const transactionDetails: DetailItem[] = [linkItem('Website', dappInfo), addressItem('From', transaction.from)];

  if (transaction.to) {
    transactionDetails.push(addressItem('To', transaction.to));
  }

  if (transactionType) {
    transactionDetails.push(textItem('Type', transactionType as string));
  }

  if (transaction.data) {
    transactionDetails.push(dataItem('Data', transaction.data));
  }

  const displayData: DisplayData = {
    title,
    network: {
      chainId: network.chainId,
      name: network.chainName,
      logoUri: network.logoUri,
    },
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
      chainId: transaction.chainId ?? network.chainId,
    },
  };

  return {
    displayData,
    signingData,
  };
};
