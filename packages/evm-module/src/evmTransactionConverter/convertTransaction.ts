import { ConvertTransactionParams, Transaction } from '../types';
import { getTxHistoryCategories } from './getTxHistoryCategories';
import { getSenderInfo } from './getSenderInfo';
import { getTokens } from './getTokens';

export const convertTransaction = async ({
  transactions,
  network,
  address,
}: ConvertTransactionParams): Promise<Transaction> => {
  const txHistoryCategories = getTxHistoryCategories(transactions, address);
  const { isOutgoing, isIncoming, isSender, from, to } = getSenderInfo(txHistoryCategories, transactions, address);
  const tokens = await getTokens(transactions, network);
  const { txType, isContractCall } = txHistoryCategories;
  const { blockTimestamp, txHash: hash, gasPrice, gasUsed } = transactions.nativeTransaction;

  return {
    isContractCall,
    isIncoming,
    isOutgoing,
    isSender,
    timestamp: blockTimestamp * 1000, // s to ms
    hash,
    from,
    to,
    tokens,
    gasPrice,
    gasUsed,
    chainId: network.chainId.toString(),
    txType,
  };
};
