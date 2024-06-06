import type { NormalTx } from '@avalabs/etherscan-sdk';
import { TokenType, TransactionType, type NetworkToken, type Transaction } from '@internal/types';
import { balanceToDisplayValue } from '@avalabs/utils-sdk';
import { isContractCall } from '../utils/isContractCall';
import { BN } from 'bn.js';
import { getExplorerAddressByNetwork } from '../utils/getExplorerAddressByNetwork';

export const convertTransactionNormal = ({
  tx,
  networkToken,
  chainId,
  explorerUrl,
  address,
}: {
  tx: NormalTx;
  networkToken: NetworkToken;
  chainId: number;
  explorerUrl: string;
  address: string;
}): Transaction => {
  const isSender = tx.from.toLowerCase() === address.toLowerCase();
  const timestamp = parseInt(tx.timeStamp) * 1000;
  const decimals = networkToken.decimals;
  const amountBN = new BN(tx.value);
  const amountDisplayValue = balanceToDisplayValue(amountBN, decimals);
  const txType = isSender ? TransactionType.SEND : TransactionType.RECEIVE;

  const { from, to, gasPrice, gasUsed, hash } = tx;
  const explorerLink = getExplorerAddressByNetwork(explorerUrl, hash);

  return {
    isIncoming: !isSender,
    isOutgoing: isSender,
    isContractCall: isContractCall(tx),
    timestamp,
    hash,
    isSender,
    from,
    to,
    tokens: [
      {
        decimal: decimals.toString(),
        name: networkToken.name,
        symbol: networkToken.symbol,
        amount: amountDisplayValue,
        type: TokenType.NATIVE,
      },
    ],
    gasUsed,
    gasPrice,
    chainId: chainId.toString(),
    txType,
    explorerLink,
  };
};
