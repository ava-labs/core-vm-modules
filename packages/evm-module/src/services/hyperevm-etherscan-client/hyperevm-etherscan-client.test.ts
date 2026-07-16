import { HyperEvmEtherscanClient } from './hyperevm-etherscan-client';

const normalTransaction = {
  blockNumber: '1',
  timeStamp: '1',
  hash: '0xhash',
  nonce: '0',
  blockHash: '0xblock',
  transactionIndex: '0',
  from: '0xfrom',
  to: '0xto',
  value: '0',
  gas: '1',
  gasPrice: '1',
  isError: '0',
  txreceipt_status: '1',
  input: '0x',
  contractAddress: '',
  cumulativeGasUsed: '1',
  gasUsed: '1',
  confirmations: '1',
};

describe('HyperEvmEtherscanClient', () => {
  it('uses the HyperEVM Etherscan proxy with explicit pagination', async () => {
    const fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: '1',
        message: 'OK',
        result: [normalTransaction],
      }),
    });
    const client = new HyperEvmEtherscanClient({
      proxyApiUrl: 'https://proxy.example',
      fetch,
    });

    await expect(client.listNormalTransactions('0xaddress', { page: 2, offset: 50 })).resolves.toEqual([
      normalTransaction,
    ]);
    expect(fetch).toHaveBeenCalledWith(
      'https://proxy.example/proxy/etherscan/hyperevm/api?module=account&action=txlist&address=0xaddress&page=2&offset=50&sort=desc',
    );
  });

  it('returns an empty list for the explorer no-transactions response', async () => {
    const client = new HyperEvmEtherscanClient({
      proxyApiUrl: 'https://proxy.example',
      fetch: jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: '0',
          message: 'No transactions found',
          result: 'No transactions found',
        }),
      }),
    });

    await expect(client.listErc20Transfers('0xaddress')).resolves.toEqual([]);
  });

  it('rejects malformed explorer responses at the boundary', async () => {
    const client = new HyperEvmEtherscanClient({
      proxyApiUrl: 'https://proxy.example',
      fetch: jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: '1', message: 'OK', result: [{ hash: '0x' }] }),
      }),
    });

    await expect(client.listInternalTransactions('0xaddress')).rejects.toThrow();
  });
});
