import type { GetBalancesResponse, GetBalancesParams, Cache } from '@avalabs/vm-module-types';
import { getNativeTokenBalance, getNativeTokenBalancesFromGlacier } from './utils/get-native-token-balances';
import { getErc20BalanceFromGlacier, getErc20Balances } from './utils/get-erc20-balances';
import { TokenService } from '../../token-service/token-service';
import { Glacier } from '@avalabs/glacier-sdk';
import { getProvider } from '../../utils/get-provider';
import { getNetworks } from '../../utils/get-networks';
import { getTokens } from '../get-tokens/get-tokens';

export const getBalances = async ({
  addresses,
  currency,
  chainId: caip2ChainId,
  proxyApiUrl,
  customTokens = [],
  glacierApiUrl,
  glacierApiKey,
}: GetBalancesParams & {
  proxyApiUrl: string;
  glacierApiUrl: string;
  glacierApiKey?: string;
  cache?: Cache;
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

  const tokenService = new TokenService({ cache, proxyApiUrl });
  const glacierSdk = new Glacier({ BASE: glacierApiUrl });
  const tokens = await getTokens({ chainId: Number(chainId), proxyApiUrl });
  const allTokens = [...tokens, ...customTokens];
  const supportedChainsResp = await glacierSdk.evmChains.supportedChains({});
  const chains = supportedChainsResp.chains.map((chain) => chain.chainId);

  let balances = [];
  if (chains.includes(chainId)) {
    balances = await Promise.allSettled(
      addresses.map(async (address) => {
        const nativeToken = await getNativeTokenBalancesFromGlacier({
          address,
          currency,
          chainId,
          glacierSdk,
        });

        const erc20Tokens = await getErc20BalanceFromGlacier({
          tokens: allTokens,
          glacierSdk,
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
    const { chainName, rpcUrl, utilityAddresses } = network;
    const provider = getProvider({
      glacierApiKey,
      chainId: network.chainId.toString(),
      chainName,
      rpcUrl,
      multiContractAddress: utilityAddresses?.multicall,
    });

    balances = await Promise.allSettled(
      addresses.map(async (address) => {
        const nativeToken = await getNativeTokenBalance({
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
