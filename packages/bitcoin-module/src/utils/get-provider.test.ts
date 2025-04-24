import { BitcoinProvider } from '@avalabs/core-wallets-sdk';

import { getProvider } from './get-provider';

jest.mock('@avalabs/core-wallets-sdk');

const PROXY_API_PROD = 'https://proxy.api';
const PROXY_API_DEV = 'https://proxy-dev.api';

describe('get-provider', () => {
  it.each([
    { isTestnet: true, proxyApiUrl: PROXY_API_DEV },
    { isTestnet: false, proxyApiUrl: PROXY_API_DEV },
    { isTestnet: false, proxyApiUrl: PROXY_API_PROD },
  ])('builds BitcoinProvider instance with proper params', async (params) => {
    const result = await getProvider(params);

    expect(BitcoinProvider).toHaveBeenCalledWith(
      !params.isTestnet,
      undefined,
      `${params.proxyApiUrl}/proxy/nownodes/${params.isTestnet ? 'btcbook-testnet' : 'btcbook'}`,
      `${params.proxyApiUrl}/proxy/nownodes/${params.isTestnet ? 'btc-testnet' : 'btc'}`,
      {},
    );

    expect(result).toBeInstanceOf(BitcoinProvider);
  });

  describe('when process.env.GLACIER_API_KEY is defined and process.env.NODE_ENV is development', () => {
    const env = process.env;

    beforeAll(() => {
      process.env = {
        ...env,
        NODE_ENV: 'development',
        GLACIER_API_KEY: 'glacier-api-key',
      };
    });

    afterAll(() => {
      process.env = env;
    });

    it('passes it to the constructor', async () => {
      await getProvider({ isTestnet: true, proxyApiUrl: PROXY_API_DEV });

      expect(BitcoinProvider).toHaveBeenCalledWith(
        false,
        undefined,
        `${PROXY_API_DEV}/proxy/nownodes/btcbook-testnet`,
        `${PROXY_API_DEV}/proxy/nownodes/btc-testnet`,
        { token: 'glacier-api-key' },
      );
    });
  });
});
