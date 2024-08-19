import { DeBank } from './de-bank';

global.fetch = jest.fn();

describe('DeBank', () => {
  let debank: DeBank;
  const baseUrl = 'https://proxy/debank';

  beforeEach(() => {
    debank = new DeBank(baseUrl);
  });

  describe('isNetworkSupported', () => {
    beforeEach(() => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve([{ community_id: 42161 }, { community_id: 56 }]),
        }),
      ) as jest.Mock;
    });

    it('should return true for supported chain IDs', async () => {
      const isSupported1 = await debank.isNetworkSupported(42161);
      expect(global.fetch).toHaveBeenCalledWith(`${baseUrl}/v1/chain/list`);
      expect(isSupported1).toBe(true);

      const isSupported2 = await debank.isNetworkSupported(56);
      expect(isSupported2).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(`${baseUrl}/v1/chain/list`);
    });

    it('should return false for unsupported chain IDs', async () => {
      const isSupported1 = await debank.isNetworkSupported(-1);
      expect(global.fetch).toHaveBeenCalledWith(`${baseUrl}/v1/chain/list`);
      expect(isSupported1).toBe(false);

      const isSupported2 = await debank.isNetworkSupported(-100);
      expect(isSupported2).toBe(false);
      expect(global.fetch).toHaveBeenCalledWith(`${baseUrl}/v1/chain/list`);
    });

    it('should cache calls to chain/list', async () => {
      await debank.isNetworkSupported(1);
      await debank.isNetworkSupported(2);
      expect(global.fetch).toHaveBeenCalledWith(`${baseUrl}/v1/chain/list`);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getChainList', () => {
    beforeEach(() => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve([{ id: 'eth', chain: 'info' }]),
        }),
      ) as jest.Mock;
    });

    it('should fetch chain info from the API', async () => {
      const chainId = 'eth';
      const chainInfo = await debank.getChainInfo({ chainId });
      expect(global.fetch).toHaveBeenCalledWith(`${baseUrl}/v1/chain/list`);
      expect(chainInfo).toEqual({ id: 'eth', chain: 'info' });
    });
  });

  describe('getTokenBalance', () => {
    beforeEach(() => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ token: 'balance' }),
        }),
      ) as jest.Mock;
    });

    it('should fetch token balance from the API', async () => {
      const chainId = 'eth';
      const address = '0x123';
      const tokenId = '0x456';
      const tokenBalance = await debank.getTokenBalance({ chainId, address, tokenId });
      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/v1/user/token?id=${address}&chain_id=${chainId}&token_id=${tokenId}`,
      );
      expect(tokenBalance).toEqual({ token: 'balance' });
    });
  });

  describe('getTokenList', () => {
    beforeEach(() => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve([{ token: 'list' }]),
        }),
      ) as jest.Mock;
    });

    it('should fetch token list from the API', async () => {
      const chainId = 'eth';
      const address = '0x123';
      const tokenList = await debank.getTokenList({ chainId, address });
      expect(global.fetch).toHaveBeenCalledWith(`${baseUrl}/v1/user/token_list?id=${address}&chain_id=${chainId}`);
      expect(tokenList).toEqual([{ token: 'list' }]);
    });
  });
});
