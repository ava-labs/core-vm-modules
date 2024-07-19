import { TokenType, TransactionType, type Network } from '@avalabs/vm-module-types';

import { convertBtcTransaction } from './convert-btc-transaction';

const btcMain: Network = {
  isTestnet: false,
  chainId: 987654,
  networkToken: {
    decimals: 8,
    name: 'Bitcoin',
    symbol: 'BTC',
  },
  explorerUrl: 'https://btc.main',
} as unknown as Network;

const btcTest: Network = {
  isTestnet: true,
  chainId: 987653,
  networkToken: {
    decimals: 8,
    name: 'Bitcoin',
    symbol: 'BTC',
  },
  explorerUrl: 'https://btc.test',
} as unknown as Network;

const userAddress = 'b1-user-address';
const txAddress = 'b1-tx-address';

const outgoingTx = {
  addresses: [txAddress],
  amount: 15_000,
  fee: 600,
  block: 100_000,
  confirmations: 1,
  containsMultisig: false,
  hash: '0x1rstTxHash',
  isSender: true,
  receivedTime: 123_456_789,
  confirmedTime: 123_456_987,
};

const incomingTx = {
  addresses: [txAddress],
  amount: 30_000,
  fee: 450,
  block: 110_000,
  confirmations: 5,
  containsMultisig: false,
  hash: '0x2ndTxHash',
  isSender: false,
  receivedTime: 123_654_789,
  confirmedTime: 123_654_987,
};

describe('convert-btc-transaction', () => {
  it('should properly map outgoing txs', () => {
    expect(convertBtcTransaction(outgoingTx, { address: userAddress, network: btcMain })).toEqual({
      chainId: btcMain.chainId.toString(),
      explorerLink: `${btcMain.explorerUrl}/btc/tx/${outgoingTx.hash}`,
      from: userAddress,
      gasUsed: outgoingTx.fee.toString(),
      hash: outgoingTx.hash,
      isContractCall: false,
      isIncoming: false,
      isOutgoing: true,
      isSender: true,
      timestamp: outgoingTx.receivedTime * 1000,
      to: txAddress,
      tokens: [
        {
          amount: (Math.abs(outgoingTx.amount) / 10 ** btcMain.networkToken.decimals).toString(),
          decimal: btcMain.networkToken.decimals.toString(),
          name: btcMain.networkToken.name,
          symbol: btcMain.networkToken.symbol,
          type: TokenType.NATIVE,
        },
      ],
      txType: TransactionType.SEND,
    });
  });

  it('should properly map incoming txs', () => {
    expect(convertBtcTransaction(incomingTx, { address: userAddress, network: btcTest })).toEqual({
      chainId: btcTest.chainId.toString(),
      explorerLink: `${btcTest.explorerUrl}/btc-testnet/tx/${incomingTx.hash}`,
      from: txAddress,
      gasUsed: incomingTx.fee.toString(),
      hash: incomingTx.hash,
      isContractCall: false,
      isIncoming: true,
      isOutgoing: false,
      isSender: false,
      timestamp: incomingTx.receivedTime * 1000,
      to: userAddress,
      tokens: [
        {
          amount: (Math.abs(incomingTx.amount) / 10 ** btcTest.networkToken.decimals).toString(),
          decimal: btcTest.networkToken.decimals.toString(),
          name: btcTest.networkToken.name,
          symbol: btcTest.networkToken.symbol,
          type: TokenType.NATIVE,
        },
      ],
      txType: TransactionType.RECEIVE,
    });
  });
});
