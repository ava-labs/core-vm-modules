import {
  NetworkVMType,
  type GetBalancesParams,
  type TokenWithBalanceAVM,
  type TokenWithBalancePVM,
} from '@avalabs/vm-module-types';
import { type AvalancheGlacierService } from '../../services/glacier-service/glacier-service';
import {
  BlockchainId,
  Network,
  type ListPChainBalancesResponse,
  type ListXChainBalancesResponse,
} from '@avalabs/glacier-sdk';
import { getNativeTokenMarketData, type TokenService } from '@internal/utils';
import { VsCurrencyType } from '@avalabs/core-coingecko-sdk';
import { isPchainBalance, isXchainBalance } from './utils';
import { convertPChainBalance } from './convert-p-chain-balance';
import { convertXChainBalance } from './covnert-x-chain-balance';
import { getProvider } from '../../utils/get-provider';

type GetAvalancheBalancesResponse = Record<string, Record<string, TokenWithBalanceAVM | TokenWithBalancePVM>>;

export const getBalances = async ({
  addresses,
  currency,
  network,
  glacierService,
  tokenService,
}: GetBalancesParams & {
  glacierService: AvalancheGlacierService;
  tokenService: TokenService;
}): Promise<GetAvalancheBalancesResponse> => {
  const provider = await getProvider({ isTestnet: Boolean(network.isTestnet) });
  const isHealthy = glacierService.isHealthy();
  if (!isHealthy) {
    return Promise.reject('Glacier is unhealthy. Try again later.');
  }

  const address = addresses[0] ?? '';
  const networkToken = network.networkToken;
  const blockchainId = network.vmName === NetworkVMType.PVM ? BlockchainId.P_CHAIN : BlockchainId.X_CHAIN;
  const glacierNetwork = network.isTestnet ? Network.FUJI : Network.MAINNET;

  const chainBalances = await glacierService
    .getChainBalance({
      blockchainId,
      network: glacierNetwork,
      addresses: addresses.join(','),
    })
    .then((value) => (value as ListPChainBalancesResponse | ListXChainBalancesResponse).balances);

  const { priceInCurrency, marketCap, vol24, change24, tokenId } = await getNativeTokenMarketData({
    network,
    tokenService,
    currency: currency.toLowerCase() as VsCurrencyType,
  });

  let balance: TokenWithBalanceAVM | TokenWithBalancePVM;
  if (isPchainBalance(chainBalances)) {
    balance = convertPChainBalance({
      balance: chainBalances,
      networkToken,
      priceInCurrency,
      marketCap,
      vol24,
      change24,
      coingeckoId: tokenId ?? '',
      avaxAssetId: provider.getContext().avaxAssetID,
    });

    return {
      [address]: {
        [networkToken.symbol]: balance,
      },
    };
  }

  if (isXchainBalance(chainBalances)) {
    balance = convertXChainBalance({
      balance: chainBalances,
      networkToken,
      priceInCurrency,
      marketCap,
      vol24,
      change24,
      coingeckoId: tokenId ?? '',
      avaxAssetId: provider.getContext().avaxAssetID,
    });
    return {
      [address]: {
        [networkToken.symbol]: balance,
      },
    };
  }
  return Promise.reject('Incorrect type balance was returned from glacier');
};
