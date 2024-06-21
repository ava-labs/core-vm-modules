import { TokenType } from '@avalabs/vm-module-types';
import { getTransactionFromEtherscan } from './get-transaction-from-etherscan';
import type { Erc20Tx, NormalTx } from '@avalabs/etherscan-sdk';

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
jest.mock('@avalabs/etherscan-sdk', () => ({
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

    if ('result' in result) {
      expect(result.result.transactions.length).toEqual(2);
    }
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
    if ('result' in result) {
      expect(result.result.transactions.length).toEqual(1);
      expect(result.result.transactions[0]?.tokens[0]?.type).toEqual(TokenType.NATIVE);
    }
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
    if ('result' in result) {
      expect(result.result.transactions.length).toEqual(1);
      expect(result.result.transactions[0]?.tokens[0]?.type).toEqual(TokenType.ERC20);
    }
  });
});
