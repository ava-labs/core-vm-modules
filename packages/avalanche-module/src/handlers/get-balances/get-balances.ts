import {
  NetworkVMType,
  type GetBalancesParams,
  type GetBalancesResponse,
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
import { getTokenPrice, isPchainBalance, isXchainBalance } from './utils';
import { convertPChainBalance } from './convert-p-chain-balance';
import { convertXChainBalance } from './covnert-x-chain-balance';

export const getBalances = async ({
  addresses,
  currency,
  network,
  glacierService,
  storage,
}: GetBalancesParams & {
  glacierService: AvalancheGlacierService;
}): Promise<GetBalancesResponse> => {
  const isHealthy = glacierService.isHealthy();
  if (!isHealthy) {
    return Promise.reject('Glacier is unhealthy. Try again later.');
  }

  const address = addresses[0] ?? '';
  const networkToken = network.networkToken;
  const coingeckoId = network.pricingProviders?.coingecko.nativeTokenId;

  const blockchainId = network.vmName === NetworkVMType.PVM ? BlockchainId.P_CHAIN : BlockchainId.X_CHAIN;
  const networkName = network.isTestnet ? Network.FUJI : Network.MAINNET;

  const chainBalances = await glacierService
    .getChainBalance({
      blockchainId,
      network: networkName,
      addresses: addresses.join(','),
    })
    .then((value) => (value as ListPChainBalancesResponse | ListXChainBalancesResponse).balances);

  const priceInCurrency = await getTokenPrice({ storage, glacierService, currency, chainId: network.chainId, address });

  let balance: TokenWithBalanceAVM | TokenWithBalancePVM;
  if (isPchainBalance(chainBalances)) {
    balance = convertPChainBalance({
      balance: chainBalances,
      networkToken,
      priceInCurrency,
      coingeckoId: coingeckoId ?? '',
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
      coingeckoId: coingeckoId ?? '',
    });
    return {
      [address]: {
        [networkToken.symbol]: balance,
      },
    };
  }
  return Promise.reject('Incorrect type balance was returned from glacier');
};
