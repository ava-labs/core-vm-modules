import { NetworkVMType } from '@avalabs/vm-module-types';
import { getNetworkFee } from './get-network-fee';

describe('get-network-fee', () => {
  it('should return fixed network fees for X-Chain', async () => {
    await expect(getNetworkFee({ isTestnet: false, vmName: NetworkVMType.AVM })).resolves.toEqual({
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
