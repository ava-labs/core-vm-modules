import {
  parseManifest,
  type AppInfo,
  type ApprovalController,
  type ConstructorParams,
  type Module,
  type Network,
  type NetworkFees,
  type RpcRequest,
  type SVMProvider,
} from '@avalabs/vm-module-types';
// import {
//   type SolanaRpcApi,
//   type SolanaRpcApiDevnet,
//   type SolanaRpcApiForAllClusters,
//   type SolanaRpcApiMainnet,
//   type SolanaRpcApiTestnet,
// } from '@solana/rpc-api';
// import { type Rpc, type RpcDevnet, type RpcMainnet, type RpcTestnet } from '@solana/rpc';
import { rpcErrors } from '@metamask/rpc-errors';
import { getProvider } from './utils/get-provider';

import ManifestJson from '../manifest.json';
import { getEnv } from './env';

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

  getProvider(network: Network): Promise<SVMProvider> {
    const provider = getProvider(network);
    return new Promise((resolve, reject) => {
      if (provider) {
        resolve(provider);
      }
      reject('We cannot get the SVM provider');
    });
  }

  // TODO
  getAddress() {
    return Promise.resolve({});
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
