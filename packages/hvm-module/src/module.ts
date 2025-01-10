import {
  type Module,
  type Manifest,
  parseManifest,
  type ConstructorParams,
  type ApprovalController,
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
  RpcMethod,
  type GetAddressParams,
} from '@avalabs/vm-module-types';

import ManifestJson from '../manifest.json';
import { getProvider } from './utils/get-provider';
import { hvmGetBalances } from './handlers/get-balances';
import { rpcErrors } from '@metamask/rpc-errors';
import { hvmSign } from './handlers/sign-transaction/sign-transaction';

export class HvmModule implements Module {
  #approvalController: ApprovalController;

  constructor({ approvalController }: ConstructorParams) {
    this.#approvalController = approvalController;
  }

  getProvider(network: Network) {
    return Promise.resolve(getProvider(network));
  }

  getManifest(): Manifest | undefined {
    const result = parseManifest(ManifestJson);
    return result.success ? result.data : undefined;
  }

  getAddress(_params: GetAddressParams): Promise<GetAddressResponse> {
    // The current parameter set does not support ed25519 public keys and this method is not used yet in the clients
    throw new Error('not implemented');
  }

  async getBalances(params: GetBalancesParams): Promise<GetBalancesResponse> {
    return hvmGetBalances(params);
  }

  async onRpcRequest(request: RpcRequest, network: Network): Promise<RpcResponse> {
    switch (request.method) {
      case RpcMethod.HVM_SIGN_TRANSACTION:
        return hvmSign({ request, network, approvalController: this.#approvalController });
      default:
        return { error: rpcErrors.methodNotSupported(`Method ${request.method} not supported`) };
    }
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
