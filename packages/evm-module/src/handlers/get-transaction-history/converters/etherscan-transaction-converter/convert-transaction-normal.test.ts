import { TokenType, TransactionType } from '@avalabs/vm-module-types';
import { convertTransactionNormal } from './convert-transaction-normal';
import type { NormalTx } from '@avalabs/core-etherscan-sdk';

describe('convertTransactionNormal ', () => {
  it('correctly converts normal transaction data', () => {
    const tx = {
      from: '0xSenderAddress',
      to: '0xReceiverAddress',
      timeStamp: '1625794800', // Unix timestamp in seconds
      value: '1000000000000000000', // 1 token in wei
      gasPrice: '20000000000', // in wei
      gasUsed: '21000',
      hash: '0xTransactionHash',
      input: '0x', // Empty input for a non-contract call
    } as NormalTx;

    const networkToken = {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    };

    const address = '0xSenderAddress';
    const explorerUrl = 'https://explorer.example.com';
    const chainId = 1;

    const expected = {
      isIncoming: false,
      isOutgoing: true,
      isContractCall: false,
      timestamp: 1625794800000, // Converted timestamp in milliseconds
      hash: '0xTransactionHash',
      isSender: true,
      from: '0xSenderAddress',
      to: '0xReceiverAddress',
      tokens: [
        {
          decimal: '18',
          name: 'Ethereum',
          symbol: 'ETH',
          amount: '1',
          type: TokenType.NATIVE,
        },
      ],
      gasUsed: '21000',
      gasPrice: '20000000000',
      chainId: '1',
      txType: TransactionType.SEND,
      explorerLink: 'https://explorer.example.com/tx/0xTransactionHash', // Assuming this is how the explorer link is formatted
    };

    const result = convertTransactionNormal({ tx, networkToken, chainId, explorerUrl, address });

    expect(result).toEqual(expected);
  });
});
