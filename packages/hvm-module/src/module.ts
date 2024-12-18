/* eslint-disable */
import {
  type Module,
  type Manifest,
  parseManifest,
  type ConstructorParams,
  type ApprovalController,
  type GetAddressParams,
  type RpcRequest,
  type TransactionHistoryResponse,
  type GetTransactionHistory,
  type Transaction,
  type Network,
  type NetworkFees,
  type GetBalancesParams,
  type GetBalancesResponse,
  type GetAddressResponse,
  type RpcResponse,
} from '@avalabs/vm-module-types';

import ManifestJson from '../manifest.json';
import { getProvider } from './utils/get-provider';

export class HvmModule implements Module {
  #approvalController: ApprovalController;

  constructor({ approvalController }: ConstructorParams) {
    this.#approvalController = approvalController;
    console.log('this.#approvalController: ', this.#approvalController);
  }

  getProvider(network: Network) {
    if (!network.vmRpcPrefix) {
      throw new Error('There is no vm rpc prefix');
    }
    return getProvider({
      rpcUrl: network.rpcUrl,
      chainName: network.chainName,
      vmRpcPrefix: network.vmRpcPrefix,
    });
  }

  getManifest(): Manifest | undefined {
    const result = parseManifest(ManifestJson);
    console.log('HvmModule getManifest result: ', result);
    return result.success ? result.data : undefined;
  }

  getAddress(_: GetAddressParams): Promise<GetAddressResponse> {
    return new Promise((res) => res({} as GetAddressResponse));
  }

  getBalances(_: GetBalancesParams): Promise<GetBalancesResponse> {
    return new Promise((res) => res({} as GetBalancesResponse));
  }

  async onRpcRequest(request: RpcRequest, chain: Network): Promise<RpcResponse> {
    console.log('onRpcRequest called: ', request);
    console.log('chain: ', chain);
    return new Promise((res) => res({} as RpcResponse));
  }

  getTransactionHistory(_: GetTransactionHistory): Promise<TransactionHistoryResponse> {
    return new Promise((res) => res({ transactions: [] as Transaction[] }));
  }

  getTokens(_: Network) {
    return Promise.resolve([]);
  }

  getNetworkFee(_: Network) {
    return Promise.resolve({} as NetworkFees);
  }
}
