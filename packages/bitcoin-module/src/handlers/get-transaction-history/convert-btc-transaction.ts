import { TokenType, TransactionType, type Network, type Transaction } from '@avalabs/vm-module-types';
import type { BitcoinHistoryTx } from '@avalabs/wallets-sdk';

type ConverterOptions = {
  address: string;
  network: Network;
};

export const convertBtcTransaction = (tx: BitcoinHistoryTx, { address, network }: ConverterOptions): Transaction => {
  const { explorerUrl, isTestnet, networkToken } = network;
  const txAddress = tx.addresses[0] ?? '';

  return {
    chainId: network.chainId.toString(),
    explorerLink: `${explorerUrl}/${isTestnet ? 'btc-testnet' : 'btc'}/tx/${tx.hash}`,
    from: tx.isSender ? address : txAddress,
    gasUsed: tx.fee.toString(),
    hash: tx.hash,
    isContractCall: false,
    isIncoming: !tx.isSender,
    isOutgoing: tx.isSender,
    isSender: tx.isSender,
    timestamp: tx.receivedTime * 1000,
    to: tx.isSender ? txAddress : address,
    tokens: [
      {
        amount: (Math.abs(tx.amount) / 10 ** networkToken.decimals).toString(),
        decimal: networkToken.decimals.toString(),
        name: networkToken.name,
        symbol: networkToken.symbol,
        type: TokenType.NATIVE,
      },
    ],
    txType: tx.isSender ? TransactionType.SEND : TransactionType.RECEIVE,
  };
};
