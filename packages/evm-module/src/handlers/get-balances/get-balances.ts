import type { GetBalancesResponse, GetBalancesParams, Storage } from '@avalabs/vm-module-types';
import { getErc20Balances } from './evm-balance-service/get-erc20-balances';
import { TokenService } from '@internal/utils';
import { getProvider } from '../../utils/get-provider';
import { getTokens } from '../get-tokens/get-tokens';
import { getNativeTokenBalances } from './evm-balance-service/get-native-token-balances';
import { getNativeTokenBalances as getNativeTokenBalancesFromGlacier } from './glacier-balance-service/get-native-token-balances';
import { getErc20Balances as getErc20BalancesFromGlacier } from './glacier-balance-service/get-erc20-balances';
import type { EvmGlacierService } from '../../services/glacier-service/glacier-service';

export const getBalances = async ({
  addresses,
  currency,
  network,
  proxyApiUrl,
  customTokens = [],
  storage,
  glacierService,
}: GetBalancesParams & {
  proxyApiUrl: string;
  glacierService: EvmGlacierService;
  storage?: Storage;
}): Promise<GetBalancesResponse> => {
  const chainId = network.chainId;
  const isNetworkSupported = await glacierService.isNetworkSupported(network.chainId);
  const isGlacierHealthy = glacierService.getGlacierHealthStatus();

  let balances = [];
  if (isGlacierHealthy && isNetworkSupported) {
    balances = await Promise.allSettled(
      addresses.map(async (address) => {
        const nativeToken = await getNativeTokenBalancesFromGlacier({
          address,
          currency,
          chainId,
          glacierService,
        });

        const erc20Tokens = await getErc20BalancesFromGlacier({
          customTokens,
          glacierService,
          currency,
          chainId,
          address,
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
  } else {
    const tokenService = new TokenService({ storage, proxyApiUrl });
    const tokens = await getTokens({ chainId: Number(chainId), proxyApiUrl });
    const allTokens = [...tokens, ...customTokens];
    const provider = getProvider({
      chainId,
      chainName: network.chainName,
      rpcUrl: network.rpcUrl,
      multiContractAddress: network.utilityAddresses?.multicall,
    });

    balances = await Promise.allSettled(
      addresses.map(async (address) => {
        const nativeToken = await getNativeTokenBalances({
          network,
          tokenService,
          address,
          currency,
          provider,
        });

        const erc20Tokens = await getErc20Balances({
          provider,
          network,
          tokenService,
          address,
          currency,
          tokens: allTokens,
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
  }

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
