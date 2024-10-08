import { getNetworkFee } from './get-network-fee';
import { FeeData, JsonRpcProvider } from 'ethers';

const params = {
  chainId: 1,
  chainName: 'Ethereum Mainnet',
  rpcUrl: 'https://mainnet.infura.io/v3/1234567890',
  caipId: 'caip:id',
  proxyApiUrl: 'https://proxy-api.avax.network',
};

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () =>
      Promise.resolve({
        'eip155:1': 1,
        'bip122:000000000019d6689c085ae165831e93': 1.5,
        'avax:11111111111111111111111111111111LpoYY': 1.5,
        'avax:2oYMBNV4eNHyqk2fjjV5nVQLDbtmNJzq5s3qs3Lo6ftnC6FByM': 1.5,
        'eip155:43114': 1.2,
        default: 2,
      }),
  }),
) as jest.Mock;

describe('get-network-fee', () => {
  it("should throw error if provider.getFeeData() doesn't return eip-1559 compatible fees", async () => {
    jest.spyOn(JsonRpcProvider.prototype, 'getFeeData').mockImplementationOnce(async () => {
      return {
        maxFeePerGas: null,
      } as FeeData;
    });
    await expect(getNetworkFee(params)).rejects.toThrow('Pre-EIP-1559 networks are not supported');
  });

  it('should return correct network fees based on maxFeePerGas returned from provider.getFeeData and the correct gas multiplier for `eip155:1` network', async () => {
    jest.spyOn(JsonRpcProvider.prototype, 'getFeeData').mockImplementationOnce(async () => {
      return {
        maxFeePerGas: 1000000000n, //1 gWei
      } as FeeData;
    });

    const fee = await getNetworkFee({ ...params, caipId: 'eip155:1' });
    expect(fee).toEqual({
      baseFee: 500000000n,
      low: {
        maxFeePerGas: 1000000000n,
        maxPriorityFeePerGas: 500000000n,
      },
      medium: {
        maxFeePerGas: 2500000000n,
        maxPriorityFeePerGas: 2000000000n,
      },
      high: {
        maxFeePerGas: 3500000000n,
        maxPriorityFeePerGas: 3000000000n,
      },
      isFixedFee: false,
    });
  });
  it('should return with the correct network fees and default gas multiplier', async () => {
    jest.spyOn(JsonRpcProvider.prototype, 'getFeeData').mockImplementationOnce(async () => {
      return {
        maxFeePerGas: 1000000000n, //1 gWei
      } as FeeData;
    });

    const fee = await getNetworkFee({ ...params });
    expect(fee).toEqual({
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
      isFixedFee: false,
    });
  });
});
