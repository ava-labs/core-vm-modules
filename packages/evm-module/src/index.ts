import { parseManifest } from '@internal/types';
import type { Module, Manifest, NetworkFees, GetTransactionHistory } from '@internal/types';
import type { JsonRpcProvider } from 'ethers';
import { getNetworkFee } from './get-network-fee';
import { getTransactionHistory } from './handlers';

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
    const manifest = require('./manifest.json');
    const result = parseManifest(manifest);
    return result.success ? result.data : undefined;
  }

  getNetworkFee(): Promise<NetworkFees> {
    return getNetworkFee(this.#provider);
  }

  getTransactionHistory(params: GetTransactionHistory) {
    return getTransactionHistory(params);
  }
}
