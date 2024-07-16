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
import { getNetworkFee } from './handlers/get-network-fee';
import { getTransactionHistory } from './handlers/get-transaction-history/get-transaction-history';
import { getEnv } from './env';
import { AvalancheGlacierService } from './services/glacier-service/glacier-service';

export class AvalancheModule implements Module {
  #glacierService: AvalancheGlacierService;

  constructor({ environment }: { environment: Environment }) {
    const { glacierApiUrl } = getEnv(environment);
    this.#glacierService = new AvalancheGlacierService({ glacierApiUrl });
  }

  getAddress(): Promise<string> {
    return Promise.resolve('Avalanche address');
  }

  getBalances(_: GetBalancesParams): Promise<GetBalancesResponse> {
    return Promise.resolve({});
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
}
