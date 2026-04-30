import { NetworkVMType, type Network } from '@avalabs/vm-module-types';
import { getNetworkFee } from './get-network-fee';

const xChainNetwork: Network = {
  isTestnet: false,
  vmName: NetworkVMType.AVM,
  chainId: 1,
  chainName: 'Avalanche X-Chain',
  rpcUrl: 'https://example.com',
  networkToken: {
    decimals: 9,
    symbol: 'AVAX',
    name: 'Avalanche',
    logoUri: '',
  },
};

describe('get-network-fee', () => {
  it('should return fixed network fees for X-Chain', async () => {
    await expect(getNetworkFee(xChainNetwork)).resolves.toEqual({
      baseFee: 1000000n,
      low: {
        maxFeePerGas: 1000000n,
      },
      medium: {
        maxFeePerGas: 1000000n,
      },
      high: {
        maxFeePerGas: 1000000n,
      },
      isFixedFee: true,
    });
  });
});
