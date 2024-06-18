import { getNetworkFee } from './get-network-fee';
import { FeeData, JsonRpcProvider } from 'ethers';

describe('get-network-fee', () => {
  it("should throw error if provider.getFeeData() doesn't return eip-1559 compatible fees", async () => {
    jest.spyOn(JsonRpcProvider.prototype, 'getFeeData').mockImplementationOnce(async () => {
      return {
        maxFeePerGas: null,
      } as FeeData;
    });
    const provider = new JsonRpcProvider();
    await expect(getNetworkFee(provider)).rejects.toThrow('Pre-EIP-1559 networks are not supported');
  });

  it('should return correct network fees based on maxFeePerGas returned from provider.getFeeData', async () => {
    jest.spyOn(JsonRpcProvider.prototype, 'getFeeData').mockImplementationOnce(async () => {
      return {
        maxFeePerGas: 1000000000n, //1 gWei
      } as FeeData;
    });
    const provider = new JsonRpcProvider();
    await expect(getNetworkFee(provider)).resolves.toEqual({
      baseFee: 1000000000n,
      low: {
        maxFeePerGas: 1500000000n,
        maxPriorityFeePerGas: 500000000n,
      },
      medium: {
        maxFeePerGas: 3000000000n,
        maxPriorityFeePerGas: 2000000000n,
      },
      high: {
        maxFeePerGas: 4000000000n,
        maxPriorityFeePerGas: 3000000000n,
      },
    });
  });
});
