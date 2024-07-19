import { getTokens } from './get-tokens';

const PROXY_API_URL = 'https://proxy-api.avax.network';

global.fetch = jest.fn();

describe('get-tokens', () => {
  beforeAll(() => {
    jest.clearAllMocks();
  });

  it('should return an empty array if chain id is not for a valid network', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const result = await getTokens({ chainId: 0, proxyApiUrl: PROXY_API_URL });

    expect(result).toEqual([]);
  });

  it('should return correct contract tokens for Avalanche C-Chain', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
          name: 'Wrapped AVAX',
          symbol: 'WAVAX',
          type: 'ERC20',
          chainId: 43114,
          decimals: 18,
        },
        {
          address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
          name: 'USD Coin',
          symbol: 'USDC',
          type: 'ERC20',
          chainId: 43114,
          decimals: 6,
        },
      ],
    });

    const result = await getTokens({ chainId: 43114, proxyApiUrl: PROXY_API_URL });

    expect(result.length).toBeGreaterThan(0);
    expect(result.find((token) => token.symbol === 'WAVAX')).toBeDefined();
    expect(result.find((token) => token.symbol === 'USDC')).toBeDefined();
  });

  it('should return correct contract tokens for Ethereum', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
          name: 'Tether USD',
          symbol: 'USDT',
          type: 'ERC20',
          chainId: 1,
          decimals: 6,
        },
        {
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          name: 'USDCoin',
          symbol: 'USDC',
          type: 'ERC20',
          chainId: 1,
          decimals: 6,
        },
        {
          address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
          name: 'Wrapped BTC',
          symbol: 'WBTC',
          type: 'ERC20',
          chainId: 1,
          decimals: 8,
        },
        {
          address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
          name: 'ChainLink Token',
          symbol: 'LINK',
          type: 'ERC20',
          chainId: 1,
          decimals: 18,
        },
      ],
    });

    const result = await getTokens({ chainId: 1, proxyApiUrl: PROXY_API_URL });

    expect(result.length).toBeGreaterThan(0);
    expect(result.find((token) => token.symbol === 'USDT')).toBeDefined();
    expect(result.find((token) => token.symbol === 'USDC')).toBeDefined();
    expect(result.find((token) => token.symbol === 'WBTC')).toBeDefined();
    expect(result.find((token) => token.symbol === 'LINK')).toBeDefined();
  });
});
