import { TransactionType } from '@avalabs/vm-module-types';
import { getTransactionsFromHyperEvm } from './get-transactions-from-hyperevm';

const normal = {
  blockNumber: '1',
  timeStamp: '100',
  hash: '0xswap',
  nonce: '0',
  blockHash: '0xblock',
  transactionIndex: '0',
  from: '0xwallet',
  to: '0xrouter',
  value: '0',
  gas: '1',
  gasPrice: '2',
  isError: '0',
  txreceipt_status: '1',
  input: '0xabcdef',
  contractAddress: '',
  cumulativeGasUsed: '1',
  gasUsed: '1',
  confirmations: '1',
};

const transfer = (from: string, to: string, symbol: string) => ({
  blockNumber: '1',
  timeStamp: '100',
  hash: '0xswap',
  nonce: '0',
  blockHash: '0xblock',
  from,
  contractAddress: '0x0000000000000000000000000000000000000001',
  to,
  value: '1000000',
  tokenName: symbol,
  tokenSymbol: symbol,
  tokenDecimal: '6',
  transactionIndex: '0',
  gas: '1',
  gasPrice: '2',
  gasUsed: '1',
  cumulativeGasUsed: '1',
  input: '0x',
  confirmations: '1',
});

describe('getTransactionsFromHyperEvm', () => {
  it('aggregates ERC-20 legs by hash into an enriched swap transaction', async () => {
    const client = {
      listNormalTransactions: jest.fn().mockResolvedValue([normal]),
      listErc20Transfers: jest
        .fn()
        .mockResolvedValue([transfer('0xwallet', '0xpool', 'USDC'), transfer('0xpool', '0xwallet', 'PURR')]),
      listInternalTransactions: jest.fn().mockResolvedValue([]),
    };

    const result = await getTransactionsFromHyperEvm({
      client,
      chainId: 999,
      networkToken: { name: 'Hyperliquid', symbol: 'HYPE', decimals: 18 },
      explorerUrl: 'https://hyperevmscan.io',
      address: '0xwallet',
    });

    expect(result).toEqual({
      nextPageToken: '',
      transactions: [
        expect.objectContaining({
          hash: '0xswap',
          chainId: '999',
          txType: TransactionType.SWAP,
          isContractCall: true,
          explorerLink: 'https://hyperevmscan.io/tx/0xswap',
          tokens: [expect.objectContaining({ symbol: 'USDC' }), expect.objectContaining({ symbol: 'PURR' })],
        }),
      ],
    });
  });

  it('uses the first page for an invalid page token', async () => {
    const client = {
      listNormalTransactions: jest.fn().mockResolvedValue([]),
      listErc20Transfers: jest.fn().mockResolvedValue([]),
      listInternalTransactions: jest.fn().mockResolvedValue([]),
    };

    const result = await getTransactionsFromHyperEvm({
      client,
      chainId: 999,
      networkToken: { name: 'Hyperliquid', symbol: 'HYPE', decimals: 18 },
      explorerUrl: 'https://hyperevmscan.io',
      address: '0xwallet',
      nextPageToken: 'not-a-page',
    });

    expect(client.listNormalTransactions).toHaveBeenCalledWith('0xwallet', { page: 1, offset: 25 });
    expect(result).toEqual({ transactions: [], nextPageToken: '' });
  });
});
