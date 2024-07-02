import type { CacheProviderParams, GetBalancesResponse, GetBalancesParams } from '@avalabs/vm-module-types';
import { getNativeTokenBalance } from './utils/get-native-token-balances';
import { getErc20Balances } from './utils/get-erc20-balances';
import { TokenService } from '../../token-service/token-service';
import { Glacier } from '@avalabs/glacier-sdk';
import { getProvider } from '../../utils/get-provider';
import { getNetworks } from '../../utils/get-networks';

export const getBalances = async ({
  addresses,
  currency,
  chainId: caip2ChainId,
  proxyApiUrl,
  customTokens,
  glacierApiUrl,
  glacierApiKey,
  getCache,
  setCache,
}: CacheProviderParams &
  GetBalancesParams & {
    proxyApiUrl: string;
    glacierApiUrl: string;
    glacierApiKey?: string;
  }): Promise<GetBalancesResponse> => {
  const chainId = caip2ChainId.split(':')[1];
  if (!chainId || isNaN(Number(chainId))) {
    throw new Error('Invalid chainId');
  }

  const networks = await getNetworks({ proxyApiUrl });
  if (networks.length === 0) {
    throw new Error('Failed to fetch networks');
  }

  const network = networks.find((n) => n.chainId === Number(chainId));
  if (network === undefined) {
    throw new Error(`Failed to fetch network for chainId ${chainId}`);
  }

  const { chainName, rpcUrl, utilityAddresses, pricingProviders, networkToken } = network;

  const provider = getProvider({
    glacierApiKey,
    chainId,
    chainName,
    rpcUrl,
    multiContractAddress: utilityAddresses?.multicall,
  });
  const tokenService = new TokenService({ getCache, setCache, proxyApiUrl });
  const glacierSdk = new Glacier({ BASE: glacierApiUrl });

  const balances = await Promise.allSettled(
    addresses.map(async (address) => {
      const nativeToken = await getNativeTokenBalance({
        provider,
        tokenService,
        address,
        coingeckoTokenId: pricingProviders?.coingecko.nativeTokenId,
        currency,
        networkToken,
        chainId,
        glacierSdk,
      });

      const erc20Tokens = await getErc20Balances({
        chainId,
        provider,
        tokenService,
        glacierSdk,
        proxyApiUrl,
        coingeckoPlatformId: pricingProviders?.coingecko.assetPlatformId,
        coingeckoTokenId: pricingProviders?.coingecko.nativeTokenId,
        address,
        currency,
        customTokens: customTokens ?? [],
      });

      return {
        address,
        balances: {
          [nativeToken.symbol]: nativeToken,
          ...erc20Tokens,
        },
      };
    }),
  );

  const filterBalances = balances.reduce((acc, result) => {
    if (result.status === 'rejected') {
      return acc;
    }

    return {
      ...acc,
      [result.value.address]: result.value.balances,
    };
  }, {} as GetBalancesResponse);

  return filterBalances;
};
