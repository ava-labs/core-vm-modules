import type {
  Module,
  Manifest,
  NetworkFees,
  GetTransactionHistory,
  RpcRequest,
  Network,
  GetBalancesParams,
  GetBalancesResponse,
  Environment,
} from '@avalabs/vm-module-types';
import { parseManifest } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import ManifestJson from '../manifest.json';
import { getNetworkFee } from './handlers/get-network-fee/get-network-fee';
import { getTransactionHistory } from './handlers/get-transaction-history/get-transaction-history';
import { getEnv } from './env';
import { AvalancheGlacierService } from './services/glacier-service/glacier-service';
// import { hashBlockchainId } from '@internal/utils';
import { getBalances } from './handlers/get-balances/get-balances';

export class AvalancheModule implements Module {
  #glacierService: AvalancheGlacierService;
  // #proxyApiUrl: string;

  constructor({ environment }: { environment: Environment }) {
    const { glacierApiUrl } = getEnv(environment);
    this.#glacierService = new AvalancheGlacierService({ glacierApiUrl });
    // this.#proxyApiUrl = proxyApiUrl;
  }

  getAddress(): Promise<string> {
    return Promise.resolve('Avalanche address');
  }

  getBalances({ addresses, network, storage, currency }: GetBalancesParams): Promise<GetBalancesResponse> {
    return getBalances({
      addresses,
      currency,
      network,
      glacierService: this.#glacierService,
      proxyApiUrl: 'https://proxy-api-dev.avax.network',
      storage,
    });
  }

  getManifest(): Manifest | undefined {
    const result = parseManifest(ManifestJson);
    return result.success ? result.data : undefined;
  }

  getNetworkFee(_: Network): Promise<NetworkFees> {
    return getNetworkFee();
  }

  getTransactionHistory({ network, address, nextPageToken, offset }: GetTransactionHistory) {
    return getTransactionHistory({ network, address, nextPageToken, offset, glacierService: this.#glacierService });
  }

  getTokens(_: Network) {
    return Promise.resolve([]);
  }

  async onRpcRequest(request: RpcRequest, _network: Network) {
    switch (request.method) {
      default:
        return { error: rpcErrors.methodNotSupported(`Method ${request.method} not supported`) };
    }
  }

  // static getHashedBlockchainId({ blockchainId, isTestnet }: { blockchainId: string; isTestnet?: boolean }): string {
  //   return hashBlockchainId({ blockchainId, isTestnet });
  // }
}
