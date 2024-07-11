import type {
  Module,
  Manifest,
  NetworkFees,
  GetTransactionHistory,
  RpcRequest,
  Network,
} from '@avalabs/vm-module-types';
import { parseManifest } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
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

  getNetworkFee(_: Network): Promise<NetworkFees> {
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
