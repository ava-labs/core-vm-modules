import { getNetworkFee } from './get-network-fee';
import { FeeData, JsonRpcProvider } from 'ethers';
import * as Network from '../../utils/get-networks';
import { NetworkVMType } from '@avalabs/chains-sdk';

const params = {
  glacierApiUrl: 'https://glacier-api.avax.network',
  chainId: 1,
  chainName: 'Ethereum Mainnet',
  rpcUrl: 'https://mainnet.infura.io/v3/1234567890',
};

jest.spyOn(Network, 'getNetworks').mockImplementationOnce(async () => {
  return [
    {
      chainId: 1,
      chainName: 'Ethereum',
      description: 'The primary public Ethereum blockchain network.',
      explorerUrl: 'https://etherscan.io',
      isTestnet: false,
      logoUri:
        'https://images.ctfassets.net/gcj8jwzm6086/6l56QLVZmvacuBfjHBTThP/791d743dd2c526692562780c2325fedf/eth-circle__1_.svg',
      networkToken: {
        name: 'Ether',
        decimals: 18,
        symbol: 'ETH',
        description:
          'Ether is used to pay for transaction fees and computational services on Etherum. Users can send Ether to other users, and developers can write smart contracts that receive, hold, and send Ether.',
        logoUri:
          'https://images.ctfassets.net/gcj8jwzm6086/6l56QLVZmvacuBfjHBTThP/791d743dd2c526692562780c2325fedf/eth-circle__1_.svg',
      },
      pricingProviders: { coingecko: { nativeTokenId: 'ethereum', assetPlatformId: 'ethereum' } },
      primaryColor: '#818384',
      rpcUrl: 'https://proxy-api.avax.network/proxy/infura/mainnet',
      subnetExplorerUriId: 'ethereum',
      utilityAddresses: { multicall: '0x5ba1e12693dc8f9c48aad8770482f4739beed696' },
      vmName: NetworkVMType.EVM,
    },
  ];
});

describe('get-network-fee', () => {
  beforeEach(() => {
    jest.spyOn(Network, 'getNetworks').mockImplementationOnce(async () => {
      return [
        {
          chainId: 1,
          chainName: 'Ethereum',
          description: 'The primary public Ethereum blockchain network.',
          explorerUrl: 'https://etherscan.io',
          isTestnet: false,
          logoUri:
            'https://images.ctfassets.net/gcj8jwzm6086/6l56QLVZmvacuBfjHBTThP/791d743dd2c526692562780c2325fedf/eth-circle__1_.svg',
          networkToken: {
            name: 'Ether',
            decimals: 18,
            symbol: 'ETH',
            description:
              'Ether is used to pay for transaction fees and computational services on Etherum. Users can send Ether to other users, and developers can write smart contracts that receive, hold, and send Ether.',
            logoUri:
              'https://images.ctfassets.net/gcj8jwzm6086/6l56QLVZmvacuBfjHBTThP/791d743dd2c526692562780c2325fedf/eth-circle__1_.svg',
          },
          pricingProviders: { coingecko: { nativeTokenId: 'ethereum', assetPlatformId: 'ethereum' } },
          primaryColor: '#818384',
          rpcUrl: 'https://proxy-api.avax.network/proxy/infura/mainnet',
          subnetExplorerUriId: 'ethereum',
          utilityAddresses: { multicall: '0x5ba1e12693dc8f9c48aad8770482f4739beed696' },
          vmName: NetworkVMType.EVM,
        },
      ];
    });
  });
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
      isFixedFee: false,
    });
  });
});
