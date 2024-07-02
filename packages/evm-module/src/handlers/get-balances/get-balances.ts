import type {
  NetworkToken,
  GetProviderParams,
  CacheProviderParams,
  TokenWithBalance,
  NetworkContractToken,
} from '@avalabs/vm-module-types';
import { getNativeTokenBalance } from './utils/get-native-token-balance';
import { getProvider } from '../../utils/get-provider';
import { getErc20Balances } from './utils/get-erc20-balance';
import { TokenService } from '../../token-service/token-service';

export const getBalances = async ({
  addresses,
  networkToken,
  currency,
  chainId,
  proxyApiUrl,
  glacierApiKey,
  coingeckoPlatformId,
  coingeckoTokenId,
  customTokens,
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
  }): Promise<Record<string, Record<string, TokenWithBalance>>> => {
  const provider = getProvider({
    glacierApiKey,
    chainId,
    chainName,
    rpcUrl,
    multiContractAddress,
  });
  const tokenService = new TokenService({ getCache, setCache, proxyApiUrl });

  const balances = await Promise.allSettled(
    addresses.map(async (address) => {
      const nativeToken = await getNativeTokenBalance({
        provider,
        tokenService,
        address,
        coingeckoTokenId,
        currency,
        networkToken,
      });

      const erc20Tokens = await getErc20Balances({
        chainId,
        provider,
        tokenService,
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
