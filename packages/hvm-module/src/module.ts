/* eslint-disable */
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
  NetworkVMType,
} from '@avalabs/vm-module-types';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

import ManifestJson from '../manifest.json';
import { getProvider } from './utils/get-provider';
import { hvmSign } from './handlers/hvm-sign';
import { hvmGetBalances } from './handlers/hvm-get-balances';

export class HvmModule implements Module {
  #approvalController: ApprovalController;
  #ED25519_AUTH_ID = 0x00;

  constructor({ approvalController }: ConstructorParams) {
    this.#approvalController = approvalController;
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
    return result.success ? result.data : undefined;
  }

  #addressBytesFromPubKey(pubKey: Uint8Array): Uint8Array {
    return new Uint8Array([this.#ED25519_AUTH_ID, ...sha256(pubKey)]);
  }

  getAddress(pubKey: any): Promise<GetAddressResponse> {
    const addressBytes = this.#addressBytesFromPubKey(pubKey);
    const hash = sha256(addressBytes);
    const checksum = hash.slice(-4); // Take last 4 bytes
    return new Promise((res) => res({ [NetworkVMType.HVM]: '0x' + bytesToHex(addressBytes) + bytesToHex(checksum) }));
  }

  async getBalances(params: GetBalancesParams) {
    const sdkClient = await this.getProvider(params.network);
    const balances = await hvmGetBalances({ ...params, sdkClient });
    return balances as unknown as GetBalancesResponse;
  }

  async onRpcRequest(request: RpcRequest, network: Network): Promise<RpcResponse> {
    console.log('onRpcRequest called: ', request);
    console.log('network: ', network);
    switch (request.method) {
      case RpcMethod.HVM_SIGN_TRANSACTION:
        return hvmSign({ request, network, approvalController: this.#approvalController });
    }
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
