import type {
  Module,
  Manifest,
  NetworkFees,
  GetTransactionHistory,
  RpcRequest,
  GetNetworkFeeParams,
} from '@avalabs/vm-module-types';
import { parseManifest } from '@avalabs/vm-module-types';
import { getNetworkFee } from './handlers/get-network-fee/get-network-fee';
import { getTransactionHistory } from './handlers/get-transaction-history/get-transaction-history';
import { getTokens } from './handlers/get-tokens/get-tokens';
import ManifestJson from './manifest.json';

export class EvmModule implements Module {
  #glacierApiUrl: string;
  #glacierApiKey?: string;
  #proxyApiUrl: string;

  constructor({
    glacierApiUrl,
    glacierApiKey,
    proxyApiUrl,
  }: {
    glacierApiUrl: string;
    glacierApiKey?: string;
    proxyApiUrl: string;
  }) {
    this.#glacierApiUrl = glacierApiUrl;
    this.#glacierApiKey = glacierApiKey;
    this.#proxyApiUrl = proxyApiUrl;
  }
  getAddress(): Promise<string> {
    return Promise.resolve('EVM address');
  }

  getBalances(): Promise<string> {
    return Promise.resolve('EVM balances');
  }

  getManifest(): Manifest | undefined {
    const result = parseManifest(ManifestJson);
    return result.success ? result.data : undefined;
  }

  getNetworkFee({ chainId, chainName, rpcUrl, multiContractAddress }: GetNetworkFeeParams): Promise<NetworkFees> {
    return getNetworkFee({
      glacierApiUrl: this.#glacierApiUrl,
      glacierApiKey: this.#glacierApiKey,
      chainId,
      chainName,
      rpcUrl,
      multiContractAddress,
    });
  }

  getTransactionHistory(params: GetTransactionHistory) {
    return getTransactionHistory({ ...params, glacierApiUrl: this.#glacierApiUrl });
  }

  getTokens(chainId: number) {
    return getTokens({ chainId, proxyApiUrl: this.#proxyApiUrl });
  }

  async onRpcRequest(request: RpcRequest) {
    // TODO implement the RPC request handler
    switch (request.method) {
      default:
        return { error: new Error(`Method ${request.method} not supported`) };
    }
  }
}
