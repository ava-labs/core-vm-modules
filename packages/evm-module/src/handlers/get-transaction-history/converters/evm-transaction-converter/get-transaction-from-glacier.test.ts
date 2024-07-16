import type { ListTransactionDetailsResponse } from '@avalabs/glacier-sdk';
import { getTransactionsFromGlacier } from './get-transactions-from-glacier';
import { EvmGlacierService } from '../../../../services/glacier-service/glacier-service';

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

describe('get-transactions-from-glacier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should have returned empty response when listTransaction failed', async () => {
    const mockGlacierService: EvmGlacierService = {
      ...expect.any(Object),
      listTransactions: jest.fn().mockRejectedValue(new Error('failed to list transactions')),
      isHealthy: jest.fn().mockReturnValue(true),
    };
    const result = await getTransactionsFromGlacier({
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
      glacierService: mockGlacierService,
    });
    expect(result).toEqual({
      transactions: [],
      nextPageToken: '',
    });
  });
  it('should have returned filtered response with no transaction status of 0', async () => {
    const mockGlacierService: EvmGlacierService = {
      ...expect.any(Object),
      listTransactions: jest.fn().mockResolvedValue({
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
      }),
      isHealthy: jest.fn().mockReturnValue(true),
    };
    const result = await getTransactionsFromGlacier({
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
      glacierService: mockGlacierService,
    });
    expect(result).toEqual({
      transactions: [],
      nextPageToken: 'nextPageToken',
    });
  });
  it('should have returned filtered response without transaction with amount 0', async () => {
    const mockGlacierService: EvmGlacierService = {
      ...expect.any(Object),
      listTransactions: jest.fn().mockResolvedValue({
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
      }),
      isHealthy: jest.fn().mockReturnValue(true),
    };
    const result = await getTransactionsFromGlacier({
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
      glacierService: mockGlacierService,
    });
    expect(result).toEqual({
      transactions: [],
      nextPageToken: 'nextPageToken',
    });
  });

  it('should have returned response', async () => {
    const mockGlacierService: EvmGlacierService = {
      ...expect.any(Object),
      listTransactions: jest.fn().mockResolvedValue(mockListTransactionDetailsResponse),
      isHealthy: jest.fn().mockReturnValue(true),
    };
    const result = await getTransactionsFromGlacier({
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
      glacierService: mockGlacierService,
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

  it('should have returned empty response', async () => {
    const mockGlacierService: EvmGlacierService = {
      ...expect.any(Object),
      listTransactions: jest.fn(),
      isHealthy: jest.fn().mockReturnValue(false),
    };
    const result = await getTransactionsFromGlacier({
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
      glacierService: mockGlacierService,
    });
    expect(result).toEqual({
      transactions: [],
      nextPageToken: '',
    });
  });
});
