import type { GetBalancesResponse, GetBalancesParams, Storage } from '@avalabs/vm-module-types';
import { getErc20Balances } from './evm-balance-service/get-erc20-balances';
import { TokenService } from '@internal/utils';
import { Glacier } from '@avalabs/glacier-sdk';
import { getProvider } from '../../utils/get-provider';
import { getTokens } from '../get-tokens/get-tokens';
import { getNativeTokenBalances } from './evm-balance-service/get-native-token-balances';
import { getNativeTokenBalances as getNativeTokenBalancesFromGlacier } from './glacier-balance-service/get-native-token-balances';
import { getErc20Balances as getErc20BalancesFromGlacier } from './glacier-balance-service/get-erc20-balances';

export const getBalances = async ({
  addresses,
  currency,
  network,
  proxyApiUrl,
  customTokens = [],
  glacierApiUrl,
  glacierApiKey,
  storage,
}: GetBalancesParams & {
  proxyApiUrl: string;
  glacierApiUrl: string;
  glacierApiKey?: string;
  storage?: Storage;
}): Promise<GetBalancesResponse> => {
  const chainId = network.chainId.split(':')[1];
  if (!chainId || isNaN(Number(chainId))) {
    throw new Error('Invalid chainId');
  }

  const glacierSdk = new Glacier({ BASE: glacierApiUrl });
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

        const erc20Tokens = await getErc20BalancesFromGlacier({
          customTokens,
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
    const tokenService = new TokenService({ storage, proxyApiUrl });
    const tokens = await getTokens({ chainId: Number(chainId), proxyApiUrl });
    const allTokens = [...tokens, ...customTokens];
    const provider = getProvider({
      glacierApiKey,
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
