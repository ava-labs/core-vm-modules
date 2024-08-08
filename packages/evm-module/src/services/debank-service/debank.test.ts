import { DeBank } from './de-bank';

global.fetch = jest.fn();

describe('DeBank', () => {
  let debank: DeBank;
  const baseUrl = 'https://proxy/debank';

  beforeEach(() => {
    debank = new DeBank(baseUrl);
  });

  describe('isNetworkSupported', () => {
    it('should return true for supported chain IDs', () => {
      expect(debank.isNetworkSupported(42161)).toBe(true);
      expect(debank.isNetworkSupported(56)).toBe(true);
    });

    it('should return false for unsupported chain IDs', () => {
      expect(debank.isNetworkSupported(1)).toBe(false);
      expect(debank.isNetworkSupported(100)).toBe(false);
    });
  });

  describe('getChainInfo', () => {
    beforeEach(() => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ chain: 'info' }),
        }),
      ) as jest.Mock;
    });

    it('should fetch chain info from the API', async () => {
      const chainId = 'eth';
      const chainInfo = await debank.getChainInfo({ chainId });
      expect(global.fetch).toHaveBeenCalledWith(`${baseUrl}/v1/chain?id=${chainId}`);
      expect(chainInfo).toEqual({ chain: 'info' });
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
