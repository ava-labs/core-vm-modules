import { TokenType, TransactionType, type Transaction } from '@avalabs/vm-module-types';
import { getTransactionFromEtherscan, mergeSwapTransactions } from './get-transaction-from-etherscan';
import type { Erc20Tx, NormalTx } from '@avalabs/core-etherscan-sdk';

const mockNormalTxs: NormalTx[] = [
  {
    blockNumber: 'blockNumber',
    timeStamp: 'timeStamp',
    hash: 'normalTxHash',
    nonce: 'nonce',
    blockHash: 'blockHash',
    transactionIndex: 'transactionIndex',
    from: 'from',
    to: 'to',
    value: '1',
    gas: '1',
    gasPrice: '1',
    isError: 'isError',
    txreceipt_status: 'txreceipt_status',
    input: 'input',
    contractAddress: 'contractAddress',
    cumulativeGasUsed: '1',
    gasUsed: '1',
    confirmations: 'confirmations',
  },
];

const mockErc20Txs: Erc20Tx[] = [
  {
    blockNumber: 'blockNumber',
    timeStamp: 'timeStamp',
    hash: 'erc20Hash',
    nonce: 'nonce',
    blockHash: 'blockHash',
    from: 'from',
    contractAddress: 'contractAddress',
    to: 'to',
    value: '1',
    tokenName: 'tokenName',
    tokenSymbol: 'tokenSymbol',
    tokenDecimal: '1',
    transactionIndex: 'transactionIndex',
    gas: '1',
    gasPrice: '1',
    input: 'input',
    cumulativeGasUsed: '1',
    gasUsed: '1',
    confirmations: 'confirmations',
  },
];
// const mockTransactions = jest.fn();
jest.mock('@avalabs/core-etherscan-sdk', () => ({
  getNormalTxs: () => mockNormalTxs,
  getErc20Txs: () => mockErc20Txs,
}));

describe('get-transaction-from-etherscan', () => {
  it('should have returned 1 normal transaction and 1 erc20 transaction', async () => {
    const result = await getTransactionFromEtherscan({
      isTestnet: false,
      chainId: 1,
      networkToken: {
        name: 'networkToken',
        symbol: 'networkToken',
        decimals: 1,
        description: 'description',
        logoUri: 'logoUri',
      },
      explorerUrl: 'explorerUrl',
      address: 'address',
      nextPageToken: '',
      offset: 1,
    });
    expect(result.transactions.length).toEqual(2);
  });

  it('should have returned 1 normal if nextPageToken contains only normal', async () => {
    const result = await getTransactionFromEtherscan({
      isTestnet: false,
      chainId: 1,
      networkToken: {
        name: 'networkToken',
        symbol: 'networkToken',
        decimals: 1,
        description: 'description',
        logoUri: 'logoUri',
      },
      explorerUrl: 'explorerUrl',
      address: 'address',
      nextPageToken: JSON.stringify({ page: 1, queries: ['normal'] }),
      offset: 1,
    });
    expect(result.transactions.length).toEqual(1);
    expect(result.transactions[0]?.tokens[0]?.type).toEqual(TokenType.NATIVE);
  });

  it('should have returned 1 erc20 if nextPageToken contains only erc20', async () => {
    const result = await getTransactionFromEtherscan({
      isTestnet: false,
      chainId: 1,
      networkToken: {
        name: 'networkToken',
        symbol: 'networkToken',
        decimals: 1,
        description: 'description',
        logoUri: 'logoUri',
      },
      explorerUrl: 'explorerUrl',
      address: 'address',
      nextPageToken: JSON.stringify({ page: 1, queries: ['erc20'] }),
      offset: 1,
    });
    expect(result.transactions.length).toEqual(1);
    expect(result.transactions[0]?.tokens[0]?.type).toEqual(TokenType.ERC20);
  });
});

describe('mergeSwapTransactions', () => {
  const baseTx: Transaction = {
    isContractCall: false,
    isIncoming: false,
    isOutgoing: true,
    isSender: true,
    timestamp: 1000,
    hash: '0xabc',
    from: '0xUser',
    to: '0xRouter',
    tokens: [],
    gasUsed: '21000',
    gasPrice: '1',
    chainId: '1',
    txType: TransactionType.SEND,
    explorerLink: 'https://etherscan.io/tx/0xabc',
  };

  it('merges normal + ERC20 with same hash into a SWAP', () => {
    const normalTx: Transaction = {
      ...baseTx,
      isContractCall: true,
      tokens: [
        {
          name: 'Ethereum',
          symbol: 'ETH',
          amount: '0.5',
          decimal: '18',
          type: TokenType.NATIVE,
          from: { address: '0xUser' },
          to: { address: '0xRouter' },
        },
      ],
    };

    const erc20Tx: Transaction = {
      ...baseTx,
      isIncoming: true,
      isOutgoing: false,
      isSender: false,
      txType: TransactionType.RECEIVE,
      tokens: [
        {
          name: 'Chainlink',
          symbol: 'LINK',
          amount: '10',
          decimal: '18',
          type: TokenType.ERC20,
          address: '0xLINK',
          from: { address: '0xPair' },
          to: { address: '0xUser' },
        },
      ],
    };

    const result = mergeSwapTransactions([normalTx], [erc20Tx]);

    expect(result).toHaveLength(1);
    expect(result[0]?.txType).toBe(TransactionType.SWAP);
    expect(result[0]?.tokens).toHaveLength(2);
    expect(result[0]?.tokens[0]?.symbol).toBe('ETH');
    expect(result[0]?.tokens[1]?.symbol).toBe('LINK');
    expect(result[0]?.isContractCall).toBe(true);
  });

  it('keeps normal and ERC20 separate when hashes differ', () => {
    const normalTx: Transaction = {
      ...baseTx,
      hash: '0x111',
      isContractCall: true,
      tokens: [
        {
          name: 'Ethereum',
          symbol: 'ETH',
          amount: '1',
          decimal: '18',
          type: TokenType.NATIVE,
          from: { address: '0xUser' },
          to: { address: '0xOther' },
        },
      ],
    };

    const erc20Tx: Transaction = {
      ...baseTx,
      hash: '0x222',
      txType: TransactionType.RECEIVE,
      tokens: [
        {
          name: 'USDC',
          symbol: 'USDC',
          amount: '100',
          decimal: '6',
          type: TokenType.ERC20,
          address: '0xUSDC',
          from: { address: '0xOther' },
          to: { address: '0xUser' },
        },
      ],
    };

    const result = mergeSwapTransactions([normalTx], [erc20Tx]);

    expect(result).toHaveLength(2);
    expect(result[0]?.txType).toBe(TransactionType.SEND);
    expect(result[1]?.txType).toBe(TransactionType.RECEIVE);
  });

  it('omits native token when ETH value is 0 (token-to-token swap)', () => {
    const normalTx: Transaction = {
      ...baseTx,
      isContractCall: true,
      tokens: [
        {
          name: 'Ethereum',
          symbol: 'ETH',
          amount: '0',
          decimal: '18',
          type: TokenType.NATIVE,
          from: { address: '0xUser' },
          to: { address: '0xRouter' },
        },
      ],
    };

    const erc20Tx: Transaction = {
      ...baseTx,
      txType: TransactionType.RECEIVE,
      tokens: [
        {
          name: 'LINK',
          symbol: 'LINK',
          amount: '5',
          decimal: '18',
          type: TokenType.ERC20,
          address: '0xLINK',
          from: { address: '0xPair' },
          to: { address: '0xUser' },
        },
      ],
    };

    const result = mergeSwapTransactions([normalTx], [erc20Tx]);

    expect(result).toHaveLength(1);
    expect(result[0]?.txType).toBe(TransactionType.SWAP);
    expect(result[0]?.tokens).toHaveLength(1);
    expect(result[0]?.tokens[0]?.symbol).toBe('LINK');
  });

  it('does not merge when normal tx is not a contract call', () => {
    const normalTx: Transaction = {
      ...baseTx,
      isContractCall: false,
      tokens: [
        {
          name: 'Ethereum',
          symbol: 'ETH',
          amount: '1',
          decimal: '18',
          type: TokenType.NATIVE,
          from: { address: '0xUser' },
          to: { address: '0xOther' },
        },
      ],
    };

    const erc20Tx: Transaction = {
      ...baseTx,
      txType: TransactionType.RECEIVE,
      tokens: [
        {
          name: 'LINK',
          symbol: 'LINK',
          amount: '5',
          decimal: '18',
          type: TokenType.ERC20,
          address: '0xLINK',
          from: { address: '0xOther' },
          to: { address: '0xUser' },
        },
      ],
    };

    const result = mergeSwapTransactions([normalTx], [erc20Tx]);

    expect(result).toHaveLength(2);
    expect(result[0]?.txType).toBe(TransactionType.SEND);
    expect(result[1]?.txType).toBe(TransactionType.RECEIVE);
  });

  it('merges multiple ERC20 transfers for the same hash', () => {
    const normalTx: Transaction = {
      ...baseTx,
      isContractCall: true,
      tokens: [
        {
          name: 'Ethereum',
          symbol: 'ETH',
          amount: '1',
          decimal: '18',
          type: TokenType.NATIVE,
          from: { address: '0xUser' },
          to: { address: '0xRouter' },
        },
      ],
    };

    const erc20Tx1: Transaction = {
      ...baseTx,
      txType: TransactionType.SEND,
      tokens: [
        {
          name: 'USDC',
          symbol: 'USDC',
          amount: '100',
          decimal: '6',
          type: TokenType.ERC20,
          address: '0xUSDC',
          from: { address: '0xUser' },
          to: { address: '0xPair' },
        },
      ],
    };

    const erc20Tx2: Transaction = {
      ...baseTx,
      txType: TransactionType.RECEIVE,
      tokens: [
        {
          name: 'LINK',
          symbol: 'LINK',
          amount: '50',
          decimal: '18',
          type: TokenType.ERC20,
          address: '0xLINK',
          from: { address: '0xPair' },
          to: { address: '0xUser' },
        },
      ],
    };

    const result = mergeSwapTransactions([normalTx], [erc20Tx1, erc20Tx2]);

    expect(result).toHaveLength(1);
    expect(result[0]?.txType).toBe(TransactionType.SWAP);
    expect(result[0]?.tokens).toHaveLength(3);
  });
});
