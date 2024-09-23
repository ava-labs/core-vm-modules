import {
  type GetBalancesParams,
  type NetworkTokenWithBalance,
  type Storage,
  type Error,
  type TokenWithBalanceEVM,
  type NftTokenWithBalance,
} from '@avalabs/vm-module-types';
import { findAsync } from '../../utils/find-async';
import type { BalanceServiceInterface } from './balance-service-interface';
import type { CurrencyCode } from '@avalabs/glacier-sdk';
import { addIdToPromise, type IdPromise, settleAllIdPromises } from '../../utils/id-promise';
import { RpcService } from '../../services/rpc-service/rpc-service';
import { isERC20Token } from '../../utils/type-utils';

type AccountAddress = string;
type TokenSymbol = string;
type GetEvmBalancesResponse = Record<AccountAddress, Record<TokenSymbol, TokenWithBalanceEVM | Error> | Error>;

export const getBalances = async ({
  addresses,
  currency,
  network,
  proxyApiUrl,
  customTokens = [],
  storage,
  balanceServices = [],
}: GetBalancesParams & {
  proxyApiUrl: string;
  balanceServices: BalanceServiceInterface[];
  storage?: Storage;
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
      nativeTokenPromises.push(
        addIdToPromise(
          supportingService.getNativeBalance({
            address,
            currency: currency.toUpperCase() as CurrencyCode,
            chainId,
          }),
          address,
        ),
      );

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

      nftTokenPromises.push(
        addIdToPromise(
          supportingService.listNftBalances({
            chainId,
            address,
          }),
          address,
        ),
      );
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
