import type { Module, Manifest, GetTransactionHistory, RpcRequest } from '@avalabs/vm-module-types';
import { RpcMethod, parseManifest } from '@avalabs/vm-module-types';
import type { JsonRpcProvider } from 'ethers';
import { getNetworkFee } from './handlers/get-network-fee/get-network-fee';
import { getTransactionHistory } from './handlers/get-transaction-history/get-transaction-history';
import ManifestJson from './manifest.json';

export class EvmModule implements Module {
  #provider: JsonRpcProvider;

  constructor({ provider }: { provider: JsonRpcProvider }) {
    this.#provider = provider;
  }

  getManifest(): Manifest | undefined {
    const result = parseManifest(ManifestJson);
    return result.success ? result.data : undefined;
  }

  async onRpcRequest(request: RpcRequest) {
    // TODO https://ava-labs.atlassian.net/browse/CP-8844
    // check origin and return error if not allowed
    // for example only Core Wallet (Mobile and Extension) can request GET_NETWORK_FEE
    switch (request.method) {
      case RpcMethod.GET_NETWORK_FEE: {
        return getNetworkFee(this.#provider);
      }
      case RpcMethod.GET_TRANSACTION_HISTORY: {
        return getTransactionHistory(request.params as GetTransactionHistory);
      }
      default:
        return { error: new Error(`Method ${request.method} not supported`) };
    }
  }
}
