import {
  parseManifest,
  type AppInfo,
  type ApprovalController,
  type ConstructorParams,
  type DeriveAddressParams,
  type Module,
  type NetworkFees,
  type RpcRequest,
} from '@avalabs/vm-module-types';
import { type Rpc, type SolanaRpcApiDevnet } from '@solana/rpc';
import { rpcErrors } from '@metamask/rpc-errors';

import ManifestJson from '../manifest.json';
import { getEnv } from './env';
import { deriveAddress } from './handlers/derive-address/derive-address';

export class SvmModule implements Module {
  #proxyApiUrl: string;
  #approvalController: ApprovalController;
  #appInfo: AppInfo;

  constructor({ approvalController, environment, appInfo }: ConstructorParams) {
    const { proxyApiUrl } = getEnv(environment);

    this.#appInfo = appInfo;
    this.#proxyApiUrl = proxyApiUrl;
    this.#approvalController = approvalController;

    // Temporarily referencing those props here just to silence eslint,
    // as eslint-disable-... comments don't seem to work on class properties.
    this.#proxyApiUrl;
    this.#approvalController;
    this.#appInfo;
  }

  // TODO
  getProvider() {
    return Promise.resolve({} as Rpc<SolanaRpcApiDevnet>);
  }

  // TODO
  getAddress() {
    return Promise.resolve({});
  }

  deriveAddress(params: DeriveAddressParams) {
    return deriveAddress({
      ...params,
      approvalController: this.#approvalController,
    });
  }

  // TODO
  getBalances() {
    return Promise.resolve({});
  }

  getManifest() {
    const result = parseManifest(ManifestJson);
    return result.success ? result.data : undefined;
  }

  // TODO
  getNetworkFee() {
    return Promise.resolve({} as NetworkFees);
  }

  // TODO
  getTransactionHistory() {
    return Promise.resolve({
      transactions: [],
    });
  }

  // TODO
  getTokens() {
    return Promise.resolve([]);
  }

  // TODO
  async onRpcRequest(request: RpcRequest) {
    return { error: rpcErrors.methodNotSupported(`Method ${request.method} not supported`) };
  }
}
