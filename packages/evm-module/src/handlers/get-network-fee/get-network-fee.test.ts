import { getNetworkFee } from './get-network-fee';
import { FeeData, JsonRpcProvider } from 'ethers';

const params = {
  glacierApiUrl: 'https://glacier-api.avax.network',
  chainId: 'eip155:1',
  chainName: 'Ethereum Mainnet',
  rpcUrl: 'https://mainnet.infura.io/v3/1234567890',
};

describe('get-network-fee', () => {
  it("should throw error if provider.getFeeData() doesn't return eip-1559 compatible fees", async () => {
    jest.spyOn(JsonRpcProvider.prototype, 'getFeeData').mockImplementationOnce(async () => {
      return {
        maxFeePerGas: null,
      } as FeeData;
    });
    await expect(getNetworkFee(params)).rejects.toThrow('Pre-EIP-1559 networks are not supported');
  });

  it('should return correct network fees based on maxFeePerGas returned from provider.getFeeData', async () => {
    jest.spyOn(JsonRpcProvider.prototype, 'getFeeData').mockImplementationOnce(async () => {
      return {
        maxFeePerGas: 1000000000n, //1 gWei
      } as FeeData;
    });
    await expect(getNetworkFee(params)).resolves.toEqual({
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
