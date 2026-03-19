import { TokenType } from '@avalabs/vm-module-types';
import { getTransactionsFromExplorerApi } from './get-transactions-from-explorer-api';
import type { Erc20Tx, NormalTx } from '@avalabs/core-etherscan-sdk';

const mockNormalTx: NormalTx = {
  blockNumber: '1',
  timeStamp: '1700000000',
  hash: 'normalHash',
  nonce: '1',
  blockHash: 'blockHash',
  transactionIndex: '0',
  from: '0xSender',
  to: '0xReceiver',
  value: '1000000000000000000',
  gas: '21000',
  gasPrice: '1000000000',
  isError: '0',
  txreceipt_status: '1',
  input: '0x',
  contractAddress: '',
  cumulativeGasUsed: '21000',
  gasUsed: '21000',
  confirmations: '100',
};

const mockErc20Tx: Erc20Tx = {
  blockNumber: '1',
  timeStamp: '1700000000',
  hash: 'erc20Hash',
  nonce: '1',
  blockHash: 'blockHash',
  from: '0xSender',
  contractAddress: '0xToken',
  to: '0xReceiver',
  value: '500000',
  tokenName: 'AIXBT',
  tokenSymbol: 'AIXBT',
  tokenDecimal: '6',
  transactionIndex: '0',
  gas: '50000',
  gasPrice: '1000000000',
  input: '0x',
  cumulativeGasUsed: '50000',
  gasUsed: '50000',
  confirmations: '100',
};

const mockFetch = jest.fn();
global.fetch = mockFetch;

const baseParams = {
  explorerApiUrl: 'https://api.basescan.org',
  networkToken: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
    description: 'Ether',
    logoUri: 'logoUri',
  },
  explorerUrl: 'https://basescan.org',
  chainId: 8453,
  address: '0xSender',
};

describe('get-transactions-from-explorer-api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch both normal and erc20 transactions', async () => {
    mockFetch
      .mockResolvedValueOnce({
        json: async () => ({ status: '1', result: [mockNormalTx] }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ status: '1', result: [mockErc20Tx] }),
      });

    const result = await getTransactionsFromExplorerApi(baseParams);

    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0]?.tokens[0]?.type).toEqual(TokenType.NATIVE);
    expect(result.transactions[1]?.tokens[0]?.type).toEqual(TokenType.ERC20);
  });

  it('should filter normal txs that also appear as erc20 txs', async () => {
    const overlappingNormalTx = { ...mockNormalTx, hash: 'sharedHash' };
    const overlappingErc20Tx = { ...mockErc20Tx, hash: 'sharedHash' };

    mockFetch
      .mockResolvedValueOnce({
        json: async () => ({ status: '1', result: [overlappingNormalTx] }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ status: '1', result: [overlappingErc20Tx] }),
      });

    const result = await getTransactionsFromExplorerApi(baseParams);

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]?.tokens[0]?.type).toEqual(TokenType.ERC20);
  });

  it('should respect pagination — only fetch normal when token says so', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ status: '1', result: [mockNormalTx] }),
    });

    const result = await getTransactionsFromExplorerApi({
      ...baseParams,
      nextPageToken: JSON.stringify({ page: 2, queries: ['normal'] }),
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]?.tokens[0]?.type).toEqual(TokenType.NATIVE);
  });

  it('should return empty nextPageToken when no results', async () => {
    mockFetch
      .mockResolvedValueOnce({
        json: async () => ({ status: '0', result: [] }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ status: '0', result: [] }),
      });

    const result = await getTransactionsFromExplorerApi(baseParams);

    expect(result.transactions).toHaveLength(0);
    expect(result.nextPageToken).toBe('');
  });

  it('should handle non-array API responses gracefully', async () => {
    mockFetch
      .mockResolvedValueOnce({
        json: async () => ({ status: '0', result: 'Max rate limit reached' }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ status: '0', result: 'Max rate limit reached' }),
      });

    const result = await getTransactionsFromExplorerApi(baseParams);

    expect(result.transactions).toHaveLength(0);
  });

  it('should call the correct explorer API URL', async () => {
    mockFetch
      .mockResolvedValueOnce({
        json: async () => ({ status: '1', result: [] }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ status: '1', result: [] }),
      });

    await getTransactionsFromExplorerApi(baseParams);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [normalCall, erc20Call] = mockFetch.mock.calls;
    expect(normalCall?.[0]).toContain('https://api.basescan.org/api?');
    expect(normalCall?.[0]).toContain('action=txlist');
    expect(erc20Call?.[0]).toContain('action=tokentx');
  });
});
