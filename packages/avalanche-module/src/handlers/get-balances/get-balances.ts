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
import { TokenService } from '@internal/utils';
import { VsCurrencyType } from '@avalabs/coingecko-sdk';
import { isPchainBalance, isXchainBalance } from './utils';
import { convertPChainBalance } from './convert-p-chain-balance';
import { convertXChainBalance } from './covnert-x-chain-balance';

export const getBalances = async ({
  addresses,
  currency,
  network,
  glacierService,
  proxyApiUrl,
  storage,
}: GetBalancesParams & {
  glacierService: AvalancheGlacierService;
  proxyApiUrl: string;
}): Promise<GetBalancesResponse> => {
  const isHealthy = glacierService.isHealthy();
  if (!isHealthy) {
    return Promise.reject('Glacier is unhealthy. Try again later.');
  }

  const tokenService = new TokenService({ storage, proxyApiUrl });

  const address = addresses[0] ?? '';
  const networkToken = network.networkToken;
  const coingeckoTokenId = network.pricingProviders?.coingecko?.nativeTokenId ?? '';

  const blockchainId = network.vmName === NetworkVMType.PVM ? BlockchainId.P_CHAIN : BlockchainId.X_CHAIN;
  const networkName = network.isTestnet ? Network.FUJI : Network.MAINNET;

  const chainBalances = await glacierService
    .getChainBalance({
      blockchainId,
      network: networkName,
      addresses: addresses.join(','),
    })
    .then((value) => (value as ListPChainBalancesResponse | ListXChainBalancesResponse).balances);

  const simplePriceResponse = coingeckoTokenId
    ? await tokenService.getSimplePrice({
        coinIds: [coingeckoTokenId],
        currencies: [currency] as VsCurrencyType[],
      })
    : {};

  const priceInCurrency = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.price ?? 0;
  const marketCap = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.marketCap ?? 0;
  const vol24 = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.vol24 ?? 0;
  const change24 = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.change24 ?? 0;

  let balance: TokenWithBalanceAVM | TokenWithBalancePVM;
  if (isPchainBalance(chainBalances)) {
    balance = convertPChainBalance({
      balance: chainBalances,
      networkToken,
      priceInCurrency,
      marketCap,
      vol24,
      change24,
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
    });
    return {
      [address]: {
        [networkToken.symbol]: balance,
      },
    };
  }
  return Promise.reject('Incorrect type balance was returned from glacier');
};
