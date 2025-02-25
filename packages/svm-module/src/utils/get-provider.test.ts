import { getSolanaProvider } from '@avalabs/core-wallets-sdk';

import { getProvider } from './get-provider';

jest.mock('@avalabs/core-wallets-sdk', () => ({
  getSolanaProvider: jest.fn(),
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
});
