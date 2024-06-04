import { Erc20Tx } from '@avalabs/etherscan-sdk';
import { getFeeString } from '../utils/getFeeString';
import { TokenType, Transaction, TransactionType } from '../types';
import { balanceToDisplayValue, stringToBN } from '@avalabs/utils-sdk';
import { Network } from '@avalabs/chains-sdk';

export function convertTransactionERC20({
  tx,
  address,
  network,
}: {
  tx: Erc20Tx;
  address: string;
  network: Network;
}): Transaction {
  const isSender = tx.from.toLowerCase() === address.toLowerCase();
  const timestamp = parseInt(tx.timeStamp) * 1000;
  const decimals = parseInt(tx.tokenDecimal);
  const amountDisplayValue = balanceToDisplayValue(stringToBN(tx.value, decimals), decimals);
  const fee = getFeeString(tx);
  const { from, to, gasPrice, gasUsed, hash, tokenDecimal, tokenName, tokenSymbol } = tx;
  const txType = isSender ? TransactionType.SEND : TransactionType.RECEIVE;

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
    fee,
    chainId: network.chainId.toString(),
    txType,
  };
}
