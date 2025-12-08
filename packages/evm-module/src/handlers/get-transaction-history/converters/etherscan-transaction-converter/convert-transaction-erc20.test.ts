import { TokenType, TransactionType } from '@avalabs/vm-module-types';
import { convertTransactionERC20 } from './convert-transaction-erc20';
import type { Erc20Tx } from '@avalabs/core-etherscan-sdk';

describe('convertTransactionERC20 ', () => {
  it('should correctly convert ERC20 transaction data', () => {
    const tx = {
      from: '0xSenderAddress',
      to: '0xReceiverAddress',
      timeStamp: '1625794800', // Unix timestamp in seconds
      value: '1000000000000000000', // in wei
      gasPrice: '20000000000', // in wei
      gasUsed: '21000',
      hash: '0xTransactionHash',
      tokenDecimal: '18',
      tokenName: 'MyToken',
      tokenSymbol: 'MTK',
      contractAddress: '0xContractAddress',
    } as Erc20Tx;

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
          name: 'MyToken',
          symbol: 'MTK',
          type: TokenType.ERC20,
          amount: '1',
          address: '0xContractAddress',
        },
      ],
      gasUsed: '21000',
      gasPrice: '20000000000',
      chainId: '1',
      txType: TransactionType.SEND,
      explorerLink: 'https://explorer.example.com/tx/0xTransactionHash', // Assuming this is how the explorer link is formatted
    };

    const result = convertTransactionERC20({ tx, address, explorerUrl, chainId });

    expect(result).toEqual(expected);
  });
});
