import {
  parseManifest,
  type AppInfo,
  type ApprovalController,
  type BuildDerivationPathParams,
  type ConstructorParams,
  type DeriveAddressParams,
  type GetBalancesParams,
  type Module,
  type Network,
  type NetworkFeeParam,
  type RpcRequest,
} from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';

import { TokenService } from '@internal/utils';

import ManifestJson from '../manifest.json';
import { getEnv } from './env';
import { deriveAddress } from './handlers/derive-address/derive-address';
import { buildDerivationPath } from './handlers/build-derivation-path/build-derivation-path';
import { getNetworkFee } from './handlers/get-network-fee/get-network-fee';
import { getTokens } from './handlers/get-tokens/get-tokens';
import { getBalances } from './handlers/get-balances/get-balances';
import { getProvider } from './utils/get-provider';
import type { SolanaProvider } from '@avalabs/core-wallets-sdk';

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

  async getProvider(network: Network): Promise<SolanaProvider> {
    return getProvider({ isTestnet: Boolean(network.isTestnet), proxyApiUrl: this.#proxyApiUrl });
  }

  // TODO
  getAddress() {
    return Promise.resolve({});
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

  getBalances(params: GetBalancesParams) {
    const tokenService = new TokenService({ storage: params.storage, proxyApiUrl: this.#proxyApiUrl });

    return getBalances({
      ...params,
      tokenService,
      proxyApiUrl: this.#proxyApiUrl,
    });
  }

  getManifest() {
    const result = parseManifest(ManifestJson);
    return result.success ? result.data : undefined;
  }

  getNetworkFee(network: NetworkFeeParam) {
    return getNetworkFee(network, this.#proxyApiUrl);
  }

  // TODO
  getTransactionHistory() {
    return Promise.resolve({
      transactions: [],
    });
  }

  getTokens(network: Network) {
    if (!network.caipId) {
      return Promise.reject({ error: rpcErrors.invalidParams(`Network must have a CAIP-2 id`) });
    }

    return getTokens({ caip2Id: network.caipId, proxyApiUrl: this.#proxyApiUrl });
  }

  // TODO
  async onRpcRequest(request: RpcRequest) {
    return { error: rpcErrors.methodNotSupported(`Method ${request.method} not supported`) };
  }
}
