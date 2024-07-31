import {
  type GetBalancesParams,
  type Storage,
  TokenType,
  type NetworkContractToken,
  type ERC20Token,
  type TokenWithBalanceEVM,
} from '@avalabs/vm-module-types';
import { getErc20Balances } from './evm-balance-service/get-erc20-balances';
import { TokenService } from '@internal/utils';
import { getProvider } from '../../utils/get-provider';
import { getTokens } from '../get-tokens/get-tokens';
import { getNativeTokenBalances } from './evm-balance-service/get-native-token-balances';
import { getNativeTokenBalances as getNativeTokenBalancesFromGlacier } from './glacier-balance-service/get-native-token-balances';
import { getErc20Balances as getErc20BalancesFromGlacier } from './glacier-balance-service/get-erc20-balances';
import type { EvmGlacierService } from '../../services/glacier-service/glacier-service';

type GetEvmBalancesResponse = Record<string, Record<string, TokenWithBalanceEVM>>;

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
}): Promise<GetEvmBalancesResponse> => {
  const chainId = network.chainId;
  const isNetworkSupported = await glacierService.isNetworkSupported(network.chainId);
  const isHealthy = glacierService.isHealthy();

  let balances = [];
  if (isHealthy && isNetworkSupported) {
    balances = await Promise.allSettled(
      addresses.map(async (address) => {
        const nativeToken = await getNativeTokenBalancesFromGlacier({
          address,
          currency,
          chainId,
          glacierService,
          coingeckoId: network.pricingProviders?.coingecko.nativeTokenId ?? '',
        });

        const erc20Tokens = await getErc20BalancesFromGlacier({
          customTokens: customTokens.filter(isERC20Token),
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
          tokens: allTokens.filter(isERC20Token),
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
  }, {} as GetEvmBalancesResponse);

  return filterBalances;
};

function isERC20Token(token: NetworkContractToken): token is ERC20Token {
  return token.type === TokenType.ERC20;
}
