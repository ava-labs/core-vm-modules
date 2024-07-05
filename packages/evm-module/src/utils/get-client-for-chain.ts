import { createPublicClient, http } from 'viem';
import type { Chain } from '@avalabs/vm-module-types';

const _getChain = (chain: Chain) => {
  const chainId = Number(chain.chainId.split(':')[1]);

  return {
    id: Number(chainId),
    name: chain.chainName,
    nativeCurrency: {
      decimals: chain.networkToken.decimals,
      symbol: chain.networkToken.symbol,
      name: chain.networkToken.name,
    },
    network: chain.chainName,
    rpcUrls: {
      default: {
        http: [chain.rpcUrl],
      },
      public: {
        http: [chain.rpcUrl],
      },
    },
    ...(chain.multiContractAddress && {
      contracts: {
        multicall3: {
          address: chain.multiContractAddress,
        },
      },
    }),
  };
};

export const getClientForChain = ({ chain }: { chain: Chain }) => {
  const chainInfo = _getChain(chain);
  const transport = http(chain.rpcUrl, { batch: true, retryCount: 0 });

  return createPublicClient({
    chain: chainInfo,
    transport,
  });
};
