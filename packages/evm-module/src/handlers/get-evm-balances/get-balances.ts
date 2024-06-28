import type {
  NetworkTokenWithBalance,
  TokenWithBalanceERC20,
  NetworkToken,
  GetProviderParams,
  CacheProviderParams,
} from '@avalabs/vm-module-types';
import { getNativeTokenBalance } from './utils/get-native-token-balance';
import { getProvider } from '../../utils/get-provider';
import { getErc20Balances } from './utils/get-erc20-balance';
import { TokenService } from '../../token-service/token-service';

export const getBalances = async ({
  accountAddress,
  networkToken,
  currency,
  chainId,
  nativeTokenId,
  proxyApiUrl,
  assetPlatformId,
  glacierApiKey,
  chainName,
  rpcUrl,
  multiContractAddress,
  getCache,
  setCache,
}: GetProviderParams &
  CacheProviderParams & {
    chainId: string;
    accountAddress: string;
    networkToken: NetworkToken;
    currency: string;
    nativeTokenId?: string;
    assetPlatformId?: string;
    proxyApiUrl: string;
  }): Promise<(NetworkTokenWithBalance | TokenWithBalanceERC20)[]> => {
  const provider = getProvider({
    glacierApiKey,
    chainId,
    chainName,
    rpcUrl,
    multiContractAddress,
  });
  const tokenService = new TokenService({ getCache, setCache, proxyApiUrl });

  const nativeToken = await getNativeTokenBalance({
    provider,
    tokenService,
    accountAddress,
    nativeTokenId: nativeTokenId ?? '',
    currency,
    networkToken,
  });

  const erc20Tokens = await getErc20Balances({
    chainId,
    provider,
    tokenService,
    proxyApiUrl,
    assetPlatformId,
    accountAddress,
    currency,
  });

  return [nativeToken, ...erc20Tokens];
};
