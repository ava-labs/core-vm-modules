import type { Erc20Tx } from '@avalabs/etherscan-sdk';
import { TokenType, TransactionType } from '@internal/types';
import type { Transaction } from '@internal/types';
import { balanceToDisplayValue, stringToBN } from '@avalabs/utils-sdk';
import type { Network } from '@avalabs/chains-sdk';
import { getExplorerAddressByNetwork } from '../utils/getExplorerAddressByNetwork';

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
  const { from, to, gasPrice, gasUsed, hash, tokenDecimal, tokenName, tokenSymbol } = tx;
  const txType = isSender ? TransactionType.SEND : TransactionType.RECEIVE;
  const explorerLink = getExplorerAddressByNetwork(network, hash);

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
    chainId: network.chainId.toString(),
    txType,
    explorerLink,
  };
}
