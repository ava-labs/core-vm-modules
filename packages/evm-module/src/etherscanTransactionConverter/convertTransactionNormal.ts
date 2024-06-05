import type { Network } from '@avalabs/chains-sdk';
import type { NormalTx } from '@avalabs/etherscan-sdk';
import { TokenType, TransactionType } from '@internal/types';
import type { Transaction } from '@internal/types';

import { balanceToDisplayValue } from '@avalabs/utils-sdk';
import { isContractCall } from '../utils/isContractCall';
import { BN } from 'bn.js';
import { getExplorerAddressByNetwork } from '../utils/getExplorerAddressByNetwork';

export const convertTransactionNormal = (tx: NormalTx, network: Network, address: string): Transaction => {
  const isSender = tx.from.toLowerCase() === address.toLowerCase();
  const timestamp = parseInt(tx.timeStamp) * 1000;
  const decimals = network.networkToken.decimals;
  const amountBN = new BN(tx.value);
  const amountDisplayValue = balanceToDisplayValue(amountBN, decimals);
  const txType = isSender ? TransactionType.SEND : TransactionType.RECEIVE;

  const { from, to, gasPrice, gasUsed, hash } = tx;
  const explorerLink = getExplorerAddressByNetwork(network, hash);

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
        name: network.networkToken.name,
        symbol: network.networkToken.symbol,
        amount: amountDisplayValue,
        type: TokenType.NATIVE,
      },
    ],
    gasUsed,
    gasPrice,
    chainId: network.chainId.toString(),
    txType,
    explorerLink,
  };
};
