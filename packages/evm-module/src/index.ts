import type { Module, Manifest, NetworkFees, GetTransactionHistory, RpcRequest } from '@avalabs/vm-module-types';
import { parseManifest } from '@avalabs/vm-module-types';
import type { JsonRpcProvider } from 'ethers';
import { getNetworkFee } from './handlers/get-network-fee/get-network-fee';
import { getTransactionHistory } from './handlers/get-transaction-history/get-transaction-history';
import ManifestJson from './manifest.json';

export class EvmModule implements Module {
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

  getNetworkFee({ provider }: { provider: JsonRpcProvider }): Promise<NetworkFees> {
    return getNetworkFee(provider);
  }

  getTransactionHistory(params: GetTransactionHistory) {
    return getTransactionHistory(params);
  }

  async onRpcRequest(request: RpcRequest) {
    // TODO implement RPC request handling
    switch (request.method) {
      default:
        return { error: new Error(`Method ${request.method} not supported`) };
    }
  }
}
