import type { Erc20Tx } from '@avalabs/etherscan-sdk';
import { TokenType, TransactionType, type Transaction } from '@avalabs/vm-module-types';
import { TokenUnit } from '@avalabs/utils-sdk';
import { getExplorerAddressByNetwork } from '../../utils/get-explorer-address-by-network';

export function convertTransactionERC20({
  tx,
  address,
  explorerUrl,
  chainId,
}: {
  tx: Erc20Tx;
  address: string;
  chainId: number;
  explorerUrl: string;
}): Transaction {
  const isSender = tx.from.toLowerCase() === address.toLowerCase();
  const timestamp = parseInt(tx.timeStamp) * 1000;
  const amount = new TokenUnit(tx.value, Number(tx.tokenDecimal), tx.tokenSymbol);
  const amountDisplayValue = amount.toDisplay();
  const { from, to, gasPrice, gasUsed, hash, tokenDecimal, tokenName, tokenSymbol } = tx;
  const txType = isSender ? TransactionType.SEND : TransactionType.RECEIVE;
  const explorerLink = getExplorerAddressByNetwork(explorerUrl, hash);

  return {
    isIncoming: !isSender,
    isOutgoing: isSender,
    isContractCall: false,
    timestamp,
    hash,
    isSender,
    from,
    to,
    tokens: [
      {
        decimal: tokenDecimal,
        name: tokenName,
        symbol: tokenSymbol,
        type: TokenType.ERC20,
        amount: amountDisplayValue,
      },
    ],
    gasUsed,
    gasPrice,
    chainId: chainId.toString(),
    txType,
    explorerLink,
  };
}
