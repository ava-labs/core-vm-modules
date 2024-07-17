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

import ManifestJson from '../manifest.json';

export class BitcoinModule implements Module {
  getAddress(): Promise<string> {
    return Promise.resolve('Bitcoin address');
  }

  getBalances() {
    return Promise.resolve('Bitcoin balances');
  }

  getManifest(): Manifest | undefined {
    const result = parseManifest(ManifestJson);
    return result.success ? result.data : undefined;
  }

  getNetworkFee(_: Network): Promise<NetworkFees> {
    return Promise.resolve({
      baseFee: 1n,
      low: {
        maxFeePerGas: 1n,
      },
      medium: {
        maxFeePerGas: 2n,
      },
      high: {
        maxFeePerGas: 4n,
      },
      isFixedFee: false,
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
