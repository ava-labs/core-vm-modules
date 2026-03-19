import { DeBank, type DeBankNftToken } from './de-bank';

type FetchArgs = Parameters<typeof fetch>;
type FetchResult = ReturnType<typeof fetch>;

describe('DeBank', () => {
  const baseUrl = 'https://proxy/debank';

  const getMockFetch = (data: unknown) =>
    jest.fn<FetchResult, FetchArgs>(() => Promise.resolve(new Response(JSON.stringify(data), { status: 200 })));

  describe('isNetworkSupported', () => {
    const mockFetch = getMockFetch([{ community_id: 42161 }, { community_id: 56 }]);

    it.each([
      { chainId: 42161, isSupported: true },
      { chainId: 56, isSupported: true },
      { chainId: 2137, isSupported: false },
      { chainId: 112, isSupported: false },
    ])('should return $isSupported for chain ID $chainId', async ({ chainId, isSupported }) => {
      const debank = new DeBank(baseUrl, mockFetch);
      const result = await debank.isNetworkSupported(chainId);
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/v1/chain/list`);
      expect(result).toBe(isSupported);
    });

    it('should cache calls to chain/list', async () => {
      const debank = new DeBank(baseUrl, mockFetch);
      await debank.isNetworkSupported(1);
      await debank.isNetworkSupported(2);
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/v1/chain/list`);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getChainList', () => {
    const mockFetch = getMockFetch([{ id: 'eth', chain: 'info' }]);

    it('should fetch chain info from the API', async () => {
      const debank = new DeBank(baseUrl, mockFetch);
      const chainId = 'eth';
      const chainInfo = await debank.getChainInfo({ chainId });
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/v1/chain/list`);
      expect(chainInfo).toEqual({ id: 'eth', chain: 'info' });
    });
  });

  describe('getTokenBalance', () => {
    const mockFetch = getMockFetch({ token: 'balance' });

    it('should fetch token balance from the API', async () => {
      const chainId = 'eth';
      const address = '0x123';
      const tokenId = '0x456';
      const debank = new DeBank(baseUrl, mockFetch);
      const tokenBalance = await debank.getTokenBalance({ chainId, address, tokenId });
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/v1/user/token?id=${address}&chain_id=${chainId}&token_id=${tokenId}`,
      );
      expect(tokenBalance).toEqual({ token: 'balance' });
    });
  });

  describe('getTokenList', () => {
    const mockFetch = getMockFetch([{ token: 'list' }]);

    it('should fetch token list from the API', async () => {
      const chainId = 'eth';
      const address = '0x123';
      const debank = new DeBank(baseUrl, mockFetch);
      const tokenList = await debank.getTokenList({ chainId, address });
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/v1/user/token_list?id=${address}&chain_id=${chainId}`);
      expect(tokenList).toEqual([{ token: 'list' }]);
    });
  });

  describe('getNftList', () => {
    const mockResponse: DeBankNftToken = {
      id: 'defc948fbe6d3b138b49bf981e276f0b',
      contract_id: '0x495f947276749ce646f68ac8c248420045cb7b5e',
      inner_id: '55',
      chain: 'eth',
      name: 'A New Era has begun',
      description:
        '3 of 9\n\nOn February 8, 2021, one of the most influential men in the world decided to invest in Bitcoin. Elon Musk, owner of Tesl',
      content_type: 'image_url',
      content:
        'https://lh3.googleusercontent.com/WQnK8JxSSPj5YIxegh9iaprMaMmv-JswrcnTp9Mi5PXKDWmigkOzTBBIAkhdXtLPe7EwIe6Q1gi2gdtLzV08d2y67rMVTHx0Ei0S',
      detail_url:
        'https://opensea.io/assets/0x495f947276749ce646f68ac8c248420045cb7b5e/55575360221028374465659771733000318579577403829328624053715758637886677712897',
      contract_name: 'OpenSea Shared Storefront',
      is_erc1155: true,
      amount: 1,
      usd_price: 51.492552,
      collection_id: '123456',
      total_supply: 1,
      thumbnail_url: 'https://thumbnail.url',
      is_core: true,
      collection_name: 'New collection',
      is_erc721: false,
    };

    const mockFetch = getMockFetch([mockResponse]);

    it('should fetch nft list from the API', async () => {
      const chainId = 'eth';
      const address = '0x123';
      const debank = new DeBank(baseUrl, mockFetch);
      const tokenList = await debank.getNftList({ chainId, address });
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/v1/user/nft_list?id=${address}&chain_id=${chainId}`);
      expect(tokenList).toEqual([mockResponse]);
    });
  });
});
