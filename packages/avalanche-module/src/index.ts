import type {
  Module,
  Manifest,
  NetworkFees,
  GetTransactionHistory,
  RpcRequest,
  GetNetworkFeeParams,
} from '@avalabs/vm-module-types';
import { parseManifest } from '@avalabs/vm-module-types';
import ManifestJson from './manifest.json';

export class AvalancheModule implements Module {
  getAddress(): Promise<string> {
    return Promise.resolve('Avalanche address');
  }

  getBalances(): Promise<string> {
    return Promise.resolve('Avalanche balances');
  }

  getManifest(): Manifest | undefined {
    const result = parseManifest(ManifestJson);
    return result.success ? result.data : undefined;
  }

  getNetworkFee(_: GetNetworkFeeParams): Promise<NetworkFees> {
    return Promise.resolve({
      low: { maxPriorityFeePerGas: 0n, maxFeePerGas: 0n },
      medium: { maxPriorityFeePerGas: 0n, maxFeePerGas: 0n },
      high: { maxPriorityFeePerGas: 0n, maxFeePerGas: 0n },
      baseFee: 0n,
    });
  }

  getTransactionHistory(_: GetTransactionHistory) {
    return Promise.resolve({ transactions: [] });
  }

  getTokens(_: number) {
    return Promise.resolve([]);
  }

  async onRpcRequest(request: RpcRequest) {
    // TODO implement the RPC request handler
    switch (request.method) {
      default:
        return { error: new Error(`Method ${request.method} not supported`) };
    }
  }
}
