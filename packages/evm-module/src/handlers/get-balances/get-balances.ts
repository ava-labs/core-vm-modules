import {
  type GetBalancesParams,
  type NetworkTokenWithBalance,
  type Storage,
  type Error,
  type TokenWithBalanceEVM,
  type NftTokenWithBalance,
  TokenType,
} from '@avalabs/vm-module-types';
import type { TokenService } from '@internal/utils';
import { findAsync } from '../../utils/find-async';
import type { BalanceServiceInterface } from './balance-service-interface';
import type { CurrencyCode } from '@avalabs/glacier-sdk';
import { addIdToPromise, type IdPromise, settleAllIdPromises } from '../../utils/id-promise';
import { RpcService } from '../../services/rpc-service/rpc-service';
import { isERC20Token } from '../../utils/type-utils';
import type { VsCurrencyType } from '@avalabs/core-coingecko-sdk';

type AccountAddress = string;
type TokenSymbol = string;
type GetEvmBalancesResponse = Record<AccountAddress, Record<TokenSymbol, TokenWithBalanceEVM | Error> | Error>;

export const getBalances = async ({
  addresses,
  currency,
  network,
  proxyApiUrl,
  tokenTypes = [TokenType.NATIVE, TokenType.ERC20, TokenType.ERC721, TokenType.ERC1155],
  customTokens = [],
  storage,
  balanceServices = [],
  tokenService,
}: GetBalancesParams & {
  proxyApiUrl: string;
  balanceServices: BalanceServiceInterface[];
  storage?: Storage;
  tokenService: TokenService;
}): Promise<GetEvmBalancesResponse> => {
  const chainId = network.chainId;
  const services: BalanceServiceInterface[] = [
    ...balanceServices,
    new RpcService({ network, storage, proxyApiUrl, customTokens }),
  ];

  const supportingService: BalanceServiceInterface | undefined = await findAsync(
    services,
    (balanceService: BalanceServiceInterface) => balanceService.isNetworkSupported(network.chainId),
  );

  const balances: GetEvmBalancesResponse = {};
  if (supportingService) {
    const nativeTokenPromises: Promise<IdPromise<NetworkTokenWithBalance>>[] = [];
    const erc20TokenPromises: Promise<IdPromise<Record<string, TokenWithBalanceEVM | Error>>>[] = [];
    const nftTokenPromises: Promise<IdPromise<Record<string, NftTokenWithBalance | Error>>>[] = [];
    addresses.forEach((address) => {
      if (tokenTypes.includes(TokenType.NATIVE)) {
        nativeTokenPromises.push(
          addIdToPromise(
            supportingService
              .getNativeBalance({
                address,
                currency: currency.toUpperCase() as CurrencyCode,
                chainId,
              })
              .then(async (nativeBalance) => {
                if (nativeBalance.symbol === 'AVAX') {
                  // we want to standardise AVAX price across the chains
                  const avaxMarketData = await tokenService.getWatchlistDataForToken({
                    tokenDetails: {
                      symbol: network.networkToken.symbol,
                      isNative: true,
                      caip2Id: network.caipId ?? '',
                    },
                    currency: currency.toUpperCase() as VsCurrencyType,
                  });

                  return {
                    ...nativeBalance,
                    priceInCurrency: avaxMarketData.priceInCurrency,
                    marketCap: avaxMarketData.marketCap,
                    vol24: avaxMarketData.vol24,
                    change24: avaxMarketData.change24,
                  };
                }

                return nativeBalance;
              }),
            address,
          ),
        );
      }

      if (tokenTypes.includes(TokenType.ERC20)) {
        erc20TokenPromises.push(
          addIdToPromise(
            supportingService.listErc20Balances({
              customTokens: customTokens.filter(isERC20Token),
              currency: currency.toUpperCase() as CurrencyCode,
              chainId,
              address,
              pageSize: 100,
            }),
            address,
          ),
        );
      }

      if (tokenTypes.includes(TokenType.ERC721) || tokenTypes.includes(TokenType.ERC1155)) {
        nftTokenPromises.push(
          addIdToPromise(
            supportingService.listNftBalances({
              network,
              address,
            }),
            address,
          ),
        );
      }
    });
    const nativeTokenBalances = await settleAllIdPromises(nativeTokenPromises);
    const erc20TokenBalances = await settleAllIdPromises(erc20TokenPromises);
    const nftTokenBalances = await settleAllIdPromises(nftTokenPromises);
    Object.keys(nativeTokenBalances).forEach((address) => {
      const balanceOrError = nativeTokenBalances[address];
      if (!balanceOrError || 'error' in balanceOrError) {
        balances[address] = {
          error: `getNativeBalance failed: ${balanceOrError?.error ?? 'unknown error'}`,
        } as Error;
        return;
      }
      const tokenSymbol = balanceOrError.symbol as string;
      balances[address] = {
        [tokenSymbol]: balanceOrError,
      };
    });
    Object.keys(erc20TokenBalances).forEach((address) => {
      const balancesOrError = erc20TokenBalances[address];
      if (!balancesOrError || ('error' in balancesOrError && typeof balancesOrError.error !== 'string')) {
        balances[address] = {
          ...balances[address],
          error: `listErc20Balances failed: unknown error`,
        };
      } else if ('error' in balancesOrError && typeof balancesOrError.error === 'string') {
        balances[address] = {
          ...balances[address],
          error: `listErc20Balances failed: ${balancesOrError.error}`,
        };
      } else {
        balances[address] = {
          ...balances[address],
          ...balancesOrError,
        };
      }
    });
    Object.keys(nftTokenBalances).forEach((address) => {
      const balancesOrError = nftTokenBalances[address];
      if (!balancesOrError || ('error' in balancesOrError && typeof balancesOrError.error !== 'string')) {
        balances[address] = {
          ...balances[address],
          error: `listNftBalances failed: unknown error`,
        };
      } else if ('error' in balancesOrError && typeof balancesOrError.error === 'string') {
        balances[address] = {
          ...balances[address],
          error: `listNftBalances failed: ${balancesOrError.error}`,
        };
      } else {
        balances[address] = {
          ...balances[address],
          ...balancesOrError,
        };
      }
    });
  } else {
    addresses.forEach((address) => {
      balances[address] = {
        error: 'unsupported network',
      };
    });
  }

  return balances;
};
