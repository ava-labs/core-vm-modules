import type {
  Module,
  Manifest,
  NetworkFees,
  GetTransactionHistory,
  RpcRequest,
  Environment,
  Network,
} from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import { RpcMethod, parseManifest } from '@avalabs/vm-module-types';
import { getTokens } from './handlers/get-tokens/get-tokens';
import { getNetworkFee } from './handlers/get-network-fee/get-network-fee';
import { getTransactionHistory } from './handlers/get-transaction-history/get-transaction-history';
import ManifestJson from './manifest.json';
import { getEnv } from './env';
import { ethSendTransaction } from './handlers/eth-send-transaction/eth-send-transaction';

export class EvmModule implements Module {
  #glacierApiUrl: string;
  #proxyApiUrl: string;

  constructor({ environment }: { environment: Environment }) {
    const { glacierApiUrl, proxyApiUrl } = getEnv(environment);
    this.#glacierApiUrl = glacierApiUrl;
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

  getNetworkFee(network: Network): Promise<NetworkFees> {
    const { chainId, chainName, rpcUrl, utilityAddresses } = network;
    return getNetworkFee({
      chainId,
      chainName,
      rpcUrl,
      multiContractAddress: utilityAddresses?.multicall,
      glacierApiUrl: this.#glacierApiUrl,
    });
  }

  getTransactionHistory(params: GetTransactionHistory) {
    const { network, address, nextPageToken, offset } = params;
    const { chainId, isTestnet, networkToken, explorerUrl = '' } = network;

    return getTransactionHistory({
      chainId,
      isTestnet,
      networkToken,
      explorerUrl,
      address,
      nextPageToken,
      offset,
      glacierApiUrl: this.#glacierApiUrl,
    });
  }

  getTokens(network: Network) {
    const { chainId } = network;
    return getTokens({ chainId, proxyApiUrl: this.#proxyApiUrl });
  }

  async onRpcRequest(request: RpcRequest, _network: Network) {
    switch (request.method) {
      default:
        return { error: rpcErrors.methodNotSupported(`Method ${request.method} not supported`) };
    }
  }
}
