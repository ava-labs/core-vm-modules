import { getNetworkFee } from './get-network-fee';

describe('get-network-fee', () => {
  it('should return fixed network fees', async () => {
    await expect(getNetworkFee()).resolves.toEqual({
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
