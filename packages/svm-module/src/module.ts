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
  type SVMProvider,
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

  async getProvider(network: Network): Promise<SVMProvider> {
    if (!network.caipId) {
      throw { error: rpcErrors.invalidParams(`Network must have a CAIP-2 id`) };
    }

    const provider = getProvider({ caipId: network.caipId, proxyApiUrl: this.#proxyApiUrl });

    return new Proxy(provider, {
      get(target, prop, receiver) {
        // Since the result of createSolanaRpc() (@solana/rpc util called internally
        // by getProvider()) is a somewhat blind Proxy object, awaiting its
        // result is impossible.
        //
        // That's because `.then()` points back to the proxy object's `.then()`,
        // and then again, and again, resulting in an endless loop of .then() calls.
        //
        // So I'm wrapping it in another Proxy object that breaks the loop
        // for Promise-like methods: then, catch and finally.
        if (prop === 'then' || prop === 'catch' || prop === 'finally') {
          return target;
        }

        return Reflect.get(target, prop, receiver);
      },
    });
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
