import { createSolanaRpc } from '@solana/rpc';

import { getClusterUrl, getProvider } from './get-provider';
import { SOLANA_DEVNET_CAIP2_ID, SOLANA_MAINNET_CAIP2_ID, SOLANA_TESTNET_CAIP2_ID } from '../constants';

jest.mock('@solana/rpc', () => ({
  createSolanaRpc: jest.fn(),
}));

const proxyApiUrl = 'https://localhost:3000';

describe('packages/svm-module/src/utils/get-provider', () => {
  it('should return with the right cluster url from the chainId or scope', () => {
    expect(getClusterUrl(proxyApiUrl, SOLANA_MAINNET_CAIP2_ID)).toBe('https://localhost:3000/proxy/nownodes/sol');

    expect(getClusterUrl(proxyApiUrl, SOLANA_DEVNET_CAIP2_ID)).toBe('https://api.devnet.solana.com');

    expect(getClusterUrl(proxyApiUrl, SOLANA_TESTNET_CAIP2_ID)).toBe('https://api.testnet.solana.com');
  });

  it('should call the `createSolanaRpc` with the right cluster url', () => {
    getProvider({ proxyApiUrl, caipId: SOLANA_MAINNET_CAIP2_ID });
    expect(createSolanaRpc).toHaveBeenCalledWith('https://localhost:3000/proxy/nownodes/sol');

    getProvider({ proxyApiUrl, caipId: SOLANA_DEVNET_CAIP2_ID });
    expect(createSolanaRpc).toHaveBeenCalledWith('https://api.devnet.solana.com');

    getProvider({ proxyApiUrl, caipId: SOLANA_TESTNET_CAIP2_ID });
    expect(createSolanaRpc).toHaveBeenCalledWith('https://api.testnet.solana.com');
  });
});
