import type { Network } from '@avalabs/vm-module-types';
import { getClusterUrl, getProvider } from './get-provider';

jest.mock('@solana/rpc', () => ({
  createSolanaRpc: jest.fn(),
}));

import { createSolanaRpc } from '@solana/rpc';

const mainnetChainId = 4503599627370463;
const devnetChainId = 4503599627370462;
const testnetChainId = 4503599627370461;
describe('packages/svm-module/src/utils/get-provider', () => {
  it('should return with the right cluster url from the chainId or scope', () => {
    expect(getClusterUrl(mainnetChainId)).toBe('/proxy/nownodes/sol');

    expect(getClusterUrl(devnetChainId)).toBe('https://api.devnet.solana.com');

    expect(getClusterUrl(testnetChainId)).toBe('https://api.testnet.solana.com');
  });
  it('should call the `createSolanaRpc` with the right cluster url', () => {
    getProvider({ chainId: mainnetChainId } as Network);
    getProvider({ chainId: devnetChainId } as Network);
    getProvider({ chainId: testnetChainId } as Network);

    expect(createSolanaRpc).toHaveBeenCalledWith('/proxy/nownodes/sol');
    expect(createSolanaRpc).toHaveBeenCalledWith('https://api.devnet.solana.com');
    expect(createSolanaRpc).toHaveBeenCalledWith('https://api.testnet.solana.com');
  });
});
