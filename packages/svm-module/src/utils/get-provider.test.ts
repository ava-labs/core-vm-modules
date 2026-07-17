import { getSolanaProvider } from '@avalabs/core-wallets-sdk';
import { addGlacierAPIKeyIfNeeded } from '@internal/utils';

import { getProvider } from './get-provider';

jest.mock('@avalabs/core-wallets-sdk', () => ({
  getSolanaProvider: jest.fn(),
}));

jest.mock('@internal/utils', () => ({
  addGlacierAPIKeyIfNeeded: jest.fn((url: string) => url),
}));

const proxyApiUrl = 'https://localhost:3000';

describe('packages/svm-module/src/utils/get-provider', () => {
  it('should call the `createSolanaRpc` with the right cluster url', () => {
    getProvider({ proxyApiUrl, isTestnet: false });
    expect(getSolanaProvider).toHaveBeenCalledWith({
      isTestnet: false,
      rpcUrl: 'https://localhost:3000/proxy/nownodes/sol',
    });

    getProvider({ proxyApiUrl, isTestnet: true });
    expect(getSolanaProvider).toHaveBeenCalledWith({
      isTestnet: true,
      rpcUrl: 'https://api.devnet.solana.com',
    });
  });

  it('should add the glacier API key to the rpc url', () => {
    jest
      .mocked(addGlacierAPIKeyIfNeeded)
      .mockReturnValue('https://proxy-api.avax.network/proxy/nownodes/sol?token=secret-key');

    getProvider({ proxyApiUrl: 'https://proxy-api.avax.network', isTestnet: false });

    expect(addGlacierAPIKeyIfNeeded).toHaveBeenCalledWith('https://proxy-api.avax.network/proxy/nownodes/sol');
    expect(getSolanaProvider).toHaveBeenCalledWith({
      isTestnet: false,
      rpcUrl: 'https://proxy-api.avax.network/proxy/nownodes/sol?token=secret-key',
    });
  });
});
