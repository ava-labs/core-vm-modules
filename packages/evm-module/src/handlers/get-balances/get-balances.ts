import type {
  NetworkToken,
  GetProviderParams,
  CacheProviderParams,
  TokenWithBalance,
  NetworkContractToken,
} from '@avalabs/vm-module-types';
import { getNativeTokenBalance } from './utils/get-native-token-balances';
import { getErc20Balances } from './utils/get-erc20-balances';
import { TokenService } from '../../token-service/token-service';
import { Glacier } from '@avalabs/glacier-sdk';
import { getProvider } from '../../utils/get-provider';

export const getBalances = async ({
  addresses,
  networkToken,
  currency,
  chainId: caip2ChainId,
  proxyApiUrl,
  coingeckoPlatformId,
  coingeckoTokenId,
  customTokens,
  glacierApiUrl,
  glacierApiKey,
  chainName,
  rpcUrl,
  multiContractAddress,
  getCache,
  setCache,
}: GetProviderParams &
  CacheProviderParams & {
    chainId: string;
    addresses: string[];
    networkToken: NetworkToken;
    currency: string;
    coingeckoPlatformId?: string;
    coingeckoTokenId?: string;
    proxyApiUrl: string;
    customTokens: NetworkContractToken[];
    glacierApiUrl: string;
  }): Promise<Record<string, Record<string, TokenWithBalance>>> => {
  const chainId = caip2ChainId.split(':')[1];
  if (!chainId || isNaN(Number(chainId))) {
    throw new Error('Invalid chainId');
  }

  const provider = getProvider({
    glacierApiKey,
    chainId,
    chainName,
    rpcUrl,
    multiContractAddress,
  });
  const tokenService = new TokenService({ getCache, setCache, proxyApiUrl });
  const glacierSdk = new Glacier({ BASE: glacierApiUrl });

  const balances = await Promise.allSettled(
    addresses.map(async (address) => {
      const nativeToken = await getNativeTokenBalance({
        provider,
        tokenService,
        address,
        coingeckoTokenId,
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
        coingeckoPlatformId,
        coingeckoTokenId,
        address,
        currency,
        customTokens,
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

  const filterBalances = balances.reduce(
    (acc, result) => {
      if (result.status === 'rejected') {
        return acc;
      }

      return {
        ...acc,
        [result.value.address]: result.value.balances,
      };
    },
    {} as Record<string, Record<string, TokenWithBalance>>,
  );

  return filterBalances;
};
