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

  it('classifies ERC-20 approve transactions as APPROVE', () => {
    const approveTx = {
      from: '0xSenderAddress',
      to: '0xTokenContractAddress',
      timeStamp: '1625794800',
      value: '0',
      gasPrice: '20000000000',
      gasUsed: '46000',
      hash: '0xApproveHash',
      input:
        '0x095ea7b3000000000000000000000000spenderaddress0000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffff',
    } as NormalTx;

    const networkToken = { name: 'Ethereum', symbol: 'ETH', decimals: 18 };
    const address = '0xSenderAddress';

    const result = convertTransactionNormal({
      tx: approveTx,
      networkToken,
      chainId: 1,
      explorerUrl: 'https://etherscan.io',
      address,
    });

    expect(result.txType).toBe(TransactionType.APPROVE);
    expect(result.isContractCall).toBe(true);
  });

  it('classifies increaseAllowance transactions as APPROVE', () => {
    const increaseAllowanceTx = {
      from: '0xSenderAddress',
      to: '0xTokenContractAddress',
      timeStamp: '1625794800',
      value: '0',
      gasPrice: '20000000000',
      gasUsed: '46000',
      hash: '0xIncreaseAllowanceHash',
      input:
        '0x39509351000000000000000000000000spenderaddress0000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffff',
    } as NormalTx;

    const networkToken = { name: 'Ethereum', symbol: 'ETH', decimals: 18 };
    const address = '0xSenderAddress';

    const result = convertTransactionNormal({
      tx: increaseAllowanceTx,
      networkToken,
      chainId: 1,
      explorerUrl: 'https://etherscan.io',
      address,
    });

    expect(result.txType).toBe(TransactionType.APPROVE);
    expect(result.isContractCall).toBe(true);
  });

  it('does not classify non-approve contract calls as APPROVE', () => {
    const transferTx = {
      from: '0xSenderAddress',
      to: '0xTokenContractAddress',
      timeStamp: '1625794800',
      value: '0',
      gasPrice: '20000000000',
      gasUsed: '46000',
      hash: '0xTransferHash',
      input:
        '0xa9059cbb000000000000000000000000recipientaddress00000000000000000000000000000000000000000000000000000000000000000000000000000000000f4240',
    } as NormalTx;

    const networkToken = { name: 'Ethereum', symbol: 'ETH', decimals: 18 };
    const address = '0xSenderAddress';

    const result = convertTransactionNormal({
      tx: transferTx,
      networkToken,
      chainId: 1,
      explorerUrl: 'https://etherscan.io',
      address,
    });

    expect(result.txType).toBe(TransactionType.SEND);
  });
});
