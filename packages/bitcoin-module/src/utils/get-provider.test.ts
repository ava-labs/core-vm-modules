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
    );

    expect(result).toBeInstanceOf(BitcoinProvider);
  });
});
