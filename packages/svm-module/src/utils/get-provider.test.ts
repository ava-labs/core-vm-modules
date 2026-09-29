import { getSolanaProvider } from '@avalabs/core-wallets-sdk';
import { SolanaCaip2ChainId } from '@avalabs/core-chains-sdk';
import { addGlacierAPIKeyIfNeeded } from '@internal/utils';
import type { Network } from '@avalabs/vm-module-types';

import { getProvider } from './get-provider';

jest.mock('@avalabs/core-wallets-sdk', () => ({
  getSolanaProvider: jest.fn(),
}));

jest.mock('@internal/utils', () => ({
  addGlacierAPIKeyIfNeeded: jest.fn((url: string) => url),
}));

const proxyApiUrl = 'https://localhost:3000';

const solanaNetwork = (caipId: string, isTestnet: boolean) => ({ caipId, isTestnet }) as unknown as Network;

describe('packages/svm-module/src/utils/get-provider', () => {
  it('routes Mainnet through the proxy', () => {
    getProvider({ proxyApiUrl, network: solanaNetwork(SolanaCaip2ChainId.MAINNET, false) });

    expect(getSolanaProvider).toHaveBeenCalledWith({
      isTestnet: false,
      rpcUrl: 'https://localhost:3000/proxy/nownodes/sol',
    });
  });

  it('routes Devnet to the Devnet RPC', () => {
    getProvider({ proxyApiUrl, network: solanaNetwork(SolanaCaip2ChainId.DEVNET, true) });

    expect(getSolanaProvider).toHaveBeenCalledWith({
      isTestnet: true,
      rpcUrl: 'https://api.devnet.solana.com',
    });
  });

  it('routes Testnet to the Testnet RPC rather than Devnet', () => {
    getProvider({ proxyApiUrl, network: solanaNetwork(SolanaCaip2ChainId.TESTNET, true) });

    expect(getSolanaProvider).toHaveBeenCalledWith({
      isTestnet: true,
      rpcUrl: 'https://api.testnet.solana.com',
    });
  });

  it('falls back to the testnet flag rather than Mainnet when the CAIP id is absent', () => {
    getProvider({ proxyApiUrl, network: { isTestnet: true } as unknown as Network });

    expect(getSolanaProvider).toHaveBeenCalledWith({
      isTestnet: true,
      rpcUrl: 'https://api.devnet.solana.com',
    });
  });

  it('routes a caip-less mainnet network through the proxy', () => {
    getProvider({ proxyApiUrl, network: { isTestnet: false } as unknown as Network });

    expect(getSolanaProvider).toHaveBeenCalledWith({
      isTestnet: false,
      rpcUrl: 'https://localhost:3000/proxy/nownodes/sol',
    });
  });

  it('should add the glacier API key to the rpc url', () => {
    jest
      .mocked(addGlacierAPIKeyIfNeeded)
      .mockReturnValue('https://proxy-api.avax.network/proxy/nownodes/sol?token=secret-key');

    getProvider({
      proxyApiUrl: 'https://proxy-api.avax.network',
      network: solanaNetwork(SolanaCaip2ChainId.MAINNET, false),
    });

    expect(addGlacierAPIKeyIfNeeded).toHaveBeenCalledWith('https://proxy-api.avax.network/proxy/nownodes/sol');
    expect(getSolanaProvider).toHaveBeenCalledWith({
      isTestnet: false,
      rpcUrl: 'https://proxy-api.avax.network/proxy/nownodes/sol?token=secret-key',
    });
  });
});
