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

  //@ts-ignore
  getAddress(params: GetAddressParams) {
    console.log('params: ', params);
    console.log('getAddress called');
  }

  //@ts-ignore
  getBalances() {
    console.log('getBalances called');
  }

  //@ts-ignore
  async onRpcRequest(request: RpcRequest) {
    console.log('onRpcRequest called: ', request);
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
