import type { NormalTx } from '@avalabs/core-etherscan-sdk';
import { TokenType, TransactionType, type NetworkToken, type Transaction } from '@avalabs/vm-module-types';
import { TokenUnit } from '@avalabs/core-utils-sdk';
import { getExplorerAddressByNetwork } from '../../utils/get-explorer-address-by-network';

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
  const amount = new TokenUnit(tx.value, networkToken.decimals, networkToken.symbol);
  const amountDisplayValue = amount.toDisplay();
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

function isContractCall(tx: NormalTx): boolean {
  return tx.input !== '0x';
}
