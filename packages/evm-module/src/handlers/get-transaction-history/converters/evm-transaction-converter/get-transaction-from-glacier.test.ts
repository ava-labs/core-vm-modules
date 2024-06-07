import type { ListTransactionDetailsResponse } from '@avalabs/glacier-sdk';
import { getTransactionsFromGlacier } from './get-transactions-from-glacier';

const mockListTransactionDetailsResponse: ListTransactionDetailsResponse = {
  nextPageToken: 'nextPageToken',
  transactions: [
    {
      nativeTransaction: {
        from: {
          address: 'address',
        },
        to: {
          address: 'address',
        },
        value: '1',
        gasLimit: '1',
        nonce: '1',
        txStatus: '1',
        txType: 1,
        blockHash: 'blockHash',
        blockIndex: 1,
        blockNumber: '1',
        blockTimestamp: 1,
        txHash: 'txHash',
        gasPrice: '1',
        gasUsed: '1',
      },
    },
  ],
};

const mockListTransactions = jest.fn();
jest.mock('@avalabs/glacier-sdk', () => ({
  Glacier: jest.fn(() => ({
    evmTransactions: {
      listTransactions: mockListTransactions,
    },
  })),
}));

describe('get-transactions-from-glacier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have returned error with missing glacier api url', async () => {
    try {
      await getTransactionsFromGlacier({
        isTestnet: false,
        networkToken: {
          name: 'networkToken',
          symbol: 'networkToken',
          decimals: 1,
          description: 'description',
          logoUri: 'logoUri',
        },
        explorerUrl: 'explorerUrl',
        chainId: 1,
        address: 'address',
        nextPageToken: 'nextPageToken',
        offset: 1,
      });
    } catch (error) {
      expect(error).toEqual(new Error('Glacier API URL is required'));
    }
  });
  it('should have returned empty response when listTransaction failed', async () => {
    mockListTransactions.mockRejectedValue(new Error('failed to list transactions'));
    const result = await getTransactionsFromGlacier({
      isTestnet: false,
      networkToken: {
        name: 'networkToken',
        symbol: 'networkToken',
        decimals: 1,
        description: 'description',
        logoUri: 'logoUri',
      },
      explorerUrl: 'explorerUrl',
      chainId: 1,
      address: 'address',
      nextPageToken: 'nextPageToken',
      offset: 1,
      glacierApiUrl: 'glacierApiUrl',
    });
    expect(result).toEqual({
      transactions: [],
      nextPageToken: '',
    });
  });
  it('should have returned filtered response with no transaction status of 0', async () => {
    mockListTransactions.mockResolvedValue({
      ...mockListTransactionDetailsResponse,
      transactions: [
        {
          ...mockListTransactionDetailsResponse.transactions[0],
          nativeTransaction: {
            ...mockListTransactionDetailsResponse.transactions[0]?.nativeTransaction,
            txStatus: '0',
          },
        },
      ],
    });
    const result = await getTransactionsFromGlacier({
      isTestnet: false,
      networkToken: {
        name: 'networkToken',
        symbol: 'networkToken',
        decimals: 1,
        description: 'description',
        logoUri: 'logoUri',
      },
      explorerUrl: 'explorerUrl',
      chainId: 1,
      address: 'address',
      nextPageToken: 'nextPageToken',
      offset: 1,
      glacierApiUrl: 'glacierApiUrl',
    });
    expect(result).toEqual({
      transactions: [],
      nextPageToken: 'nextPageToken',
    });
  });
  it('should have returned filtered response without transaction with amount 0', async () => {
    mockListTransactions.mockResolvedValue({
      ...mockListTransactionDetailsResponse,
      transactions: [
        {
          ...mockListTransactionDetailsResponse.transactions[0],
          nativeTransaction: {
            ...mockListTransactionDetailsResponse.transactions[0]?.nativeTransaction,
            value: '0',
          },
        },
      ],
    });
    const result = await getTransactionsFromGlacier({
      isTestnet: false,
      networkToken: {
        name: 'networkToken',
        symbol: 'networkToken',
        decimals: 1,
        description: 'description',
        logoUri: 'logoUri',
      },
      explorerUrl: 'explorerUrl',
      chainId: 1,
      address: 'address',
      nextPageToken: 'nextPageToken',
      offset: 1,
      glacierApiUrl: 'glacierApiUrl',
    });
    expect(result).toEqual({
      transactions: [],
      nextPageToken: 'nextPageToken',
    });
  });

  it('should have returned response', async () => {
    mockListTransactions.mockResolvedValue(mockListTransactionDetailsResponse);
    const result = await getTransactionsFromGlacier({
      isTestnet: false,
      networkToken: {
        name: 'networkToken',
        symbol: 'networkToken',
        decimals: 1,
        description: 'description',
        logoUri: 'logoUri',
      },
      explorerUrl: 'explorerUrl',
      chainId: 1,
      address: 'address',
      nextPageToken: 'nextPageToken',
      offset: 1,
      glacierApiUrl: 'glacierApiUrl',
    });
    expect(result).toEqual({
      transactions: [
        {
          isContractCall: false,
          isIncoming: false,
          isOutgoing: true,
          isSender: true,
          timestamp: 1000,
          hash: 'txHash',
          from: 'address',
          to: 'address',
          tokens: [
            {
              amount: '0.1',
              symbol: 'networkToken',
              decimal: '1',
              name: 'networkToken',
              type: 'NATIVE',
              from: {
                address: 'address',
              },
              to: {
                address: 'address',
              },
            },
          ],
          gasPrice: '1',
          gasUsed: '1',
          chainId: '1',
          txType: 'Send',
          explorerLink: 'explorerUrl/tx/txHash',
        },
      ],
      nextPageToken: 'nextPageToken',
    });
  });
});
