import type {
  Module,
  Manifest,
  NetworkFees,
  GetTransactionHistory,
  RpcRequest,
  Network,
  Environment,
  GetBalancesParams,
} from '@avalabs/vm-module-types';
import { parseManifest } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import { getEnv } from './env';

import ManifestJson from '../manifest.json';
import { getNetworkFee } from './handlers/get-network-fee';
import { getTransactionHistory } from './handlers/get-transaction-history';
import { getBalances } from './handlers/get-balances';

export class BitcoinModule implements Module {
  #proxyApiUrl: string;

  constructor({ environment }: { environment: Environment }) {
    const { proxyApiUrl } = getEnv(environment);
    this.#proxyApiUrl = proxyApiUrl;
  }

  getAddress(): Promise<string> {
    return Promise.resolve('Bitcoin address');
  }

  getBalances({ addresses, currency, network, storage }: GetBalancesParams) {
    return getBalances({
      addresses,
      currency,
      network,
      proxyApiUrl: this.#proxyApiUrl,
      storage,
    });
  }

  getManifest(): Manifest | undefined {
    const result = parseManifest(ManifestJson);
    return result.success ? result.data : undefined;
  }

  getNetworkFee(network: Network): Promise<NetworkFees> {
    return getNetworkFee({
      isTestnet: Boolean(network.isTestnet),
      proxyApiUrl: this.#proxyApiUrl,
    });
  }

  async getTransactionHistory({ address, network }: GetTransactionHistory) {
    return {
      transactions: await getTransactionHistory({
        address,
        network,
        proxyApiUrl: this.#proxyApiUrl,
      }),
    };
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
