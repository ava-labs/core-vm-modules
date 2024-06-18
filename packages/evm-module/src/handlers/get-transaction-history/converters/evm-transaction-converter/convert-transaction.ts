import type { Transaction, NetworkToken } from '@internal/types';
import { getTxType } from './get-tx-type';
import { getSenderInfo } from './get-sender-info';
import { getTokens } from './get-tokens';
import { getExplorerAddressByNetwork } from '../../utils/get-explorer-address-by-network';
import type { TransactionDetails } from '@avalabs/glacier-sdk';
import { NonContractCallTypes } from '../../../../types';

type ConvertTransactionParams = {
  transactions: TransactionDetails;
  explorerUrl: string;
  networkToken: NetworkToken;
  chainId: number;
  address: string;
};

export const convertTransaction = async ({
  transactions,
  explorerUrl,
  networkToken,
  chainId,
  address,
}: ConvertTransactionParams): Promise<Transaction> => {
  const tokens = await getTokens(transactions, networkToken);
  const txType = getTxType(transactions, address, tokens);
  const { isOutgoing, isIncoming, isSender, from, to } = getSenderInfo(txType, transactions, address);
  const { blockTimestamp, txHash: hash, gasPrice, gasUsed } = transactions.nativeTransaction;
  const explorerLink = getExplorerAddressByNetwork(explorerUrl, hash);
  const isContractCall = !NonContractCallTypes.includes(txType);

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
    chainId: chainId.toString(),
    txType,
    explorerLink,
  };
};
