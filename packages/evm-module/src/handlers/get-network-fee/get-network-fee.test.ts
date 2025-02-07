import { getNetworkFee } from './get-network-fee';
import { Block, JsonRpcProvider } from 'ethers';

const params = {
  chainId: 1,
  chainName: 'Ethereum Mainnet',
  rpcUrl: 'https://mainnet.infura.io/v3/1234567890',
  caipId: 'caip:id',
  proxyApiUrl: 'https://proxy-api.avax.network',
};

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        'eip155:1': 1,
        'bip122:000000000019d6689c085ae165831e93': 1.5,
        'avax:11111111111111111111111111111111LpoYY': 1.5,
        'avax:2oYMBNV4eNHyqk2fjjV5nVQLDbtmNJzq5s3qs3Lo6ftnC6FByM': 1.5,
        'eip155:43114': 3,
        default: 2,
      }),
  }),
) as jest.Mock;

describe('get-network-fee', () => {
  it("should throw error if provider.getFeeData() doesn't return eip-1559 compatible fees", async () => {
    jest.spyOn(JsonRpcProvider.prototype, 'getBlock').mockImplementationOnce(async () => {
      return {
        baseFeePerGas: null,
      } as Block;
    });
    await expect(getNetworkFee(params)).rejects.toThrow('Pre-EIP-1559 networks are not supported');
  });

  describe('for C-Chain', () => {
    const cChainParams = {
      ...params,
      chainId: 43114,
    };

    const suggestedPrices = {
      slow: {
        maxPriorityFeePerGas: '0x1',
        maxFeePerGas: '0x3b9aca01',
      },
      normal: {
        maxPriorityFeePerGas: '0x1',
        maxFeePerGas: '0x3b9aca01',
      },
      fast: {
        maxPriorityFeePerGas: '0x1',
        maxFeePerGas: '0x3e95ba81',
      },
    };

    beforeEach(() => {
      jest.spyOn(JsonRpcProvider.prototype, 'getBlock').mockImplementationOnce(async () => {
        return {
          baseFeePerGas: 1000000000n,
        } as Block;
      });
    });

    it('uses eth_suggestPriceOptions', async () => {
      jest.spyOn(JsonRpcProvider.prototype, 'send').mockImplementationOnce(async () => {
        return suggestedPrices;
      });

      const fee = await getNetworkFee({ ...cChainParams });

      expect(JsonRpcProvider.prototype.send).toHaveBeenCalledWith('eth_suggestPriceOptions', []);
      expect(fee).toEqual({
        baseFee: BigInt(suggestedPrices.normal.maxFeePerGas),
        low: {
          maxFeePerGas: BigInt(suggestedPrices.slow.maxFeePerGas),
          maxPriorityFeePerGas: BigInt(suggestedPrices.slow.maxPriorityFeePerGas),
        },
        medium: {
          maxFeePerGas: BigInt(suggestedPrices.normal.maxFeePerGas),
          maxPriorityFeePerGas: BigInt(suggestedPrices.normal.maxPriorityFeePerGas),
        },
        high: {
          maxFeePerGas: BigInt(suggestedPrices.fast.maxFeePerGas),
          maxPriorityFeePerGas: BigInt(suggestedPrices.fast.maxPriorityFeePerGas),
        },
        isFixedFee: false,
        displayDecimals: 9,
      });
    });

    it('falls back to regular fee fetching if eth_suggestPriceOptions fails', async () => {
      jest.spyOn(JsonRpcProvider.prototype, 'send').mockRejectedValueOnce(new Error('Oopsies'));

      const fee = await getNetworkFee({ ...cChainParams });

      expect(fee).toEqual({
        baseFee: 3000000000n,
        low: {
          maxFeePerGas: 3500000000n,
          maxPriorityFeePerGas: 500000000n,
        },
        medium: {
          maxFeePerGas: 5000000000n,
          maxPriorityFeePerGas: 2000000000n,
        },
        high: {
          maxFeePerGas: 6000000000n,
          maxPriorityFeePerGas: 3000000000n,
        },
        isFixedFee: false,
        displayDecimals: 9,
      });
    });
  });

  it('should return correct network fees based on maxFeePerGas returned from the last block and the default gas multiplier for the unknown network', async () => {
    jest.spyOn(JsonRpcProvider.prototype, 'getBlock').mockImplementationOnce(async () => {
      return {
        baseFeePerGas: 1000000000n,
      } as Block;
    });
    const fee = await getNetworkFee({ ...params });
    expect(fee).toEqual({
      baseFee: 3000000000n,
      low: {
        maxFeePerGas: 3500000000n,
        maxPriorityFeePerGas: 500000000n,
      },
      medium: {
        maxFeePerGas: 5000000000n,
        maxPriorityFeePerGas: 2000000000n,
      },
      high: {
        maxFeePerGas: 6000000000n,
        maxPriorityFeePerGas: 3000000000n,
      },
      isFixedFee: false,
      displayDecimals: 9,
    });
  });
  it('should return with the correct network fees and default gas multiplier and the fiexed fee is `true` because of the newtork chainId (swimmer)', async () => {
    jest.spyOn(JsonRpcProvider.prototype, 'getBlock').mockImplementationOnce(async () => {
      return {
        baseFeePerGas: 1000000000n,
      } as Block;
    });
    const fee = await getNetworkFee({ ...params, caipId: 'eip155:43114' });
    expect(fee).toEqual({
      baseFee: 4000000000n,
      low: {
        maxFeePerGas: 4500000000n,
        maxPriorityFeePerGas: 500000000n,
      },
      medium: {
        maxFeePerGas: 6000000000n,
        maxPriorityFeePerGas: 2000000000n,
      },
      high: {
        maxFeePerGas: 7000000000n,
        maxPriorityFeePerGas: 3000000000n,
      },
      isFixedFee: false,
      displayDecimals: 9,
    });
  });
});
