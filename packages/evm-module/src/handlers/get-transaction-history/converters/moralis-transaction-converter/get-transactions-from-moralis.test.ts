import { TokenType, TransactionType } from '@avalabs/vm-module-types';
import { getTransactionsFromMoralis } from './get-transactions-from-moralis';
import type { MoralisTransaction, MoralisWalletHistoryResponse } from './moralis-types';

const mockNetworkToken = {
  name: 'Ether',
  symbol: 'ETH',
  decimals: 18,
  description: 'Ether',
  logoUri: 'https://example.com/eth.png',
};

const mockMoralisTx: MoralisTransaction = {
  hash: '0xabc123',
  nonce: '5',
  from_address: '0xSender',
  to_address: '0xReceiver',
  value: '1000000000000000000',
  gas: '21000',
  gas_price: '1000000000',
  receipt_gas_used: '21000',
  receipt_status: '1',
  block_timestamp: '2025-11-14T12:00:00.000Z',
  block_number: '100',
  method_label: null,
  erc20_transfers: [],
  native_transfers: [
    {
      from_address: '0xSender',
      to_address: '0xReceiver',
      value: '1000000000000000000',
      value_formatted: '1',
      direction: 'send',
      internal_transaction: false,
      token_symbol: 'ETH',
    },
  ],
  nft_transfers: [],
  summary: 'Sent 1 ETH',
  category: 'send',
};

const mockFetch = jest.fn();
global.fetch = mockFetch;

const baseParams = {
  chainId: 8453,
  networkToken: mockNetworkToken,
  explorerUrl: 'https://basescan.org',
  address: '0xSender',
};

function mockMoralisResponse(result: MoralisTransaction[], cursor: string | null = null): MoralisWalletHistoryResponse {
  return { cursor, page_size: 25, page: 0, result };
}

describe('getTransactionsFromMoralis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and convert transactions', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMoralisResponse([mockMoralisTx]),
    });

    const result = await getTransactionsFromMoralis(baseParams);

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]?.hash).toBe('0xabc123');
    expect(result.transactions[0]?.txType).toBe(TransactionType.SEND);
    expect(result.transactions[0]?.tokens[0]?.type).toBe(TokenType.NATIVE);
  });

  it('should call the correct proxy URL with hex chain ID', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMoralisResponse([]),
    });

    await getTransactionsFromMoralis(baseParams);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = mockFetch.mock.calls[0]?.[0] as string;
    expect(url).toContain('proxy-api.avax.network/proxy/moralis-evm/wallets/0xSender/history');
    expect(url).toContain('chain=0x2105');
  });

  it('should pass cursor for pagination', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMoralisResponse([]),
    });

    await getTransactionsFromMoralis({
      ...baseParams,
      nextPageToken: 'some-cursor-value',
    });

    const url = mockFetch.mock.calls[0]?.[0] as string;
    expect(url).toContain('cursor=some-cursor-value');
  });

  it('should return cursor as nextPageToken', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMoralisResponse([mockMoralisTx], 'next-page-cursor'),
    });

    const result = await getTransactionsFromMoralis(baseParams);

    expect(result.nextPageToken).toBe('next-page-cursor');
  });

  it('should return empty nextPageToken when cursor is null', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMoralisResponse([mockMoralisTx], null),
    });

    const result = await getTransactionsFromMoralis(baseParams);

    expect(result.nextPageToken).toBe('');
  });

  it('should filter out failed transactions', async () => {
    const failedTx: MoralisTransaction = {
      ...mockMoralisTx,
      hash: '0xfailed',
      receipt_status: '0',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMoralisResponse([mockMoralisTx, failedTx]),
    });

    const result = await getTransactionsFromMoralis(baseParams);

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]?.hash).toBe('0xabc123');
  });

  it('should return empty transactions on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await getTransactionsFromMoralis(baseParams);

    expect(result.transactions).toHaveLength(0);
    expect(result.nextPageToken).toBe('');
  });

  it('should return empty transactions on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await getTransactionsFromMoralis(baseParams);

    expect(result.transactions).toHaveLength(0);
    expect(result.nextPageToken).toBe('');
  });

  it('should return empty transactions on non-array result', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cursor: null, page_size: 25, page: 0, result: 'error' }),
    });

    const result = await getTransactionsFromMoralis(baseParams);

    expect(result.transactions).toHaveLength(0);
  });

  it('should pass offset as limit parameter', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMoralisResponse([]),
    });

    await getTransactionsFromMoralis({ ...baseParams, offset: 50 });

    const url = mockFetch.mock.calls[0]?.[0] as string;
    expect(url).toContain('limit=50');
  });

  it('should default limit to 25 when offset is not provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMoralisResponse([]),
    });

    await getTransactionsFromMoralis(baseParams);

    const url = mockFetch.mock.calls[0]?.[0] as string;
    expect(url).toContain('limit=25');
  });

  it('should use correct hex chain IDs for supported networks', async () => {
    const chainConfigs = [
      { chainId: 8453, expectedHex: '0x2105' },
      { chainId: 42161, expectedHex: '0xa4b1' },
      { chainId: 10, expectedHex: '0xa' },
    ];

    for (const { chainId, expectedHex } of chainConfigs) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMoralisResponse([]),
      });

      await getTransactionsFromMoralis({ ...baseParams, chainId });

      const url = mockFetch.mock.calls.at(-1)?.[0] as string;
      expect(url).toContain(`chain=${expectedHex}`);
    }
  });
});
