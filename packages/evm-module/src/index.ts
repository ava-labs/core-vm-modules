import { parseManifest } from '@internal/types';
import type { Module, Manifest, NetworkFees, GetTransactionHistory } from '@avalabs/vm-module-types';
import type { JsonRpcProvider } from 'ethers';
import { getNetworkFee } from './handlers/get-network-fee';
import { getTransactionHistory } from './handlers/get-transaction-history';
import ManifestJson from './manifest.json';

export class EvmModule implements Module {
  #provider: JsonRpcProvider;

  constructor(provider: JsonRpcProvider) {
    this.#provider = provider;
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

  getNetworkFee(): Promise<NetworkFees> {
    return getNetworkFee(this.#provider);
  }

  getTransactionHistory(params: GetTransactionHistory) {
    return getTransactionHistory(params);
  }
}
