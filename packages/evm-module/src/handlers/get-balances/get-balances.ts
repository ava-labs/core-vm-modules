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
import type { EvmGlacierService } from '../../services/glacier-service/glacier-service';
import { DeBankService } from '../../services/debank-service/debank-service';
import { findAsync } from '../../utils/find-async';
import type { BalanceServiceInterface } from './balance-service-interface';
import type { CurrencyCode } from '@avalabs/glacier-sdk';

type AccountAddress = string;
type TokenSymbol = string;
type GetEvmBalancesResponse = Record<AccountAddress, Record<TokenSymbol, TokenWithBalanceEVM>>;

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
  const services: BalanceServiceInterface[] = [glacierService, new DeBankService({ proxyApiUrl })];

  const supportingService: BalanceServiceInterface | undefined = await findAsync(
    services,
    (balanceService: BalanceServiceInterface) => balanceService.isNetworkSupported(network.chainId),
  );

  let balances;
  if (supportingService) {
    balances = await Promise.allSettled(
      addresses.map(async (address) => {
        const nativeToken = await supportingService.getNativeBalance({
          address,
          currency: currency.toUpperCase() as CurrencyCode,
          chainId,
        });

        const erc20Tokens = await supportingService.listErc20Balances({
          customTokens: customTokens.filter(isERC20Token),
          currency: currency.toUpperCase() as CurrencyCode,
          chainId,
          address,
          pageSize: 100,
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
