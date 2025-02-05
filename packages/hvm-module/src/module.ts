import {
  type Module,
  type Manifest,
  parseManifest,
  type ConstructorParams,
  type ApprovalController,
  type RpcRequest,
  type TransactionHistoryResponse,
  type GetTransactionHistory,
  type Network,
  type NetworkFees,
  type GetBalancesParams,
  type GetBalancesResponse,
  type GetAddressResponse,
  type RpcResponse,
  RpcMethod,
  type GetAddressParams,
  type DeriveAddressParams,
  type BuildDerivationPathParams,
} from '@avalabs/vm-module-types';

import ManifestJson from '../manifest.json';
import { getProvider } from './utils/get-provider';
import { hvmGetBalances } from './handlers/get-balances';
import { rpcErrors } from '@metamask/rpc-errors';
import { hvmSign } from './handlers/sign-transaction/sign-transaction';
import { deriveAddress } from './handlers/derive-address/derive-address';
import { buildDerivationPath } from './handlers/build-derivation-path/build-derivation-path';

export class HvmModule implements Module {
  #approvalController: ApprovalController;

  constructor({ approvalController }: ConstructorParams) {
    this.#approvalController = approvalController;
  }

  getProvider(network: Network) {
    try {
      return Promise.resolve(getProvider(network));
    } catch (e) {
      return Promise.reject(e);
    }
  }

  getManifest(): Manifest | undefined {
    const result = parseManifest(ManifestJson);
    return result.success ? result.data : undefined;
  }

  buildDerivationPath(params: BuildDerivationPathParams) {
    return buildDerivationPath(params);
  }

  deriveAddress(params: DeriveAddressParams) {
    return deriveAddress({
      ...params,
      approvalController: this.#approvalController,
    });
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
    return Promise.resolve({ transactions: [] });
  }

  getTokens(_: Network) {
    return Promise.resolve([]);
  }

  getNetworkFee(_: Network): Promise<NetworkFees> {
    return Promise.reject(new Error('not implemented'));
  }
}
