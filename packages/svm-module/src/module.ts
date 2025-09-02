import {
  parseManifest,
  RpcMethod,
  type AppInfo,
  type ApprovalController,
  type BuildDerivationPathParams,
  type ConstructorParams,
  type DeriveAddressParams,
  type GetBalancesParams,
  type GetTransactionHistory,
  type Module,
  type Network,
  type NetworkFeeParam,
  type RpcRequest,
} from '@avalabs/vm-module-types';
import type { SolanaProvider } from '@avalabs/core-wallets-sdk';
import { rpcErrors } from '@metamask/rpc-errors';

import { TokenService } from '@internal/utils';

import ManifestJson from '../manifest.json';
import { getEnv } from './env';
import { deriveAddress } from './handlers/derive-address';
import { buildDerivationPath } from './handlers/build-derivation-path';
import { getNetworkFee } from './handlers/get-network-fee';
import { getTokens } from './handlers/get-tokens';
import { getBalances } from './handlers/get-balances';
import { getProvider } from './utils/get-provider';
import { getTransactionHistory } from './handlers/get-transaction-history';
import { signAndSendTransaction } from './handlers/sign-and-send-transaction';
import { signTransaction } from './handlers/sign-transaction';
import { signMessage } from './handlers/sign-message';
import Blockaid from '@blockaid/client';
import { BLOCKAID_API_KEY } from './constants';

export class SvmModule implements Module {
  #proxyApiUrl: string;
  #approvalController: ApprovalController;
  #appInfo: AppInfo;
  #blockaid: Blockaid;

  constructor({ approvalController, environment, appInfo, blockaid }: ConstructorParams) {
    const { proxyApiUrl } = getEnv(environment);

    this.#appInfo = appInfo;
    this.#proxyApiUrl = proxyApiUrl;
    this.#approvalController = approvalController;

    // Temporarily referencing those props here just to silence eslint,
    // as eslint-disable-... comments don't seem to work on class properties.
    this.#proxyApiUrl;
    this.#approvalController;
    this.#appInfo;
    this.#blockaid =
      blockaid ??
      new Blockaid({
        baseURL: proxyApiUrl + '/proxy/blockaid/',
        apiKey: BLOCKAID_API_KEY,
      });
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

  getTransactionHistory(params: GetTransactionHistory) {
    return getTransactionHistory({
      network: params.network,
      address: params.address,
      proxyApiUrl: this.#proxyApiUrl,
    });
  }

  getTokens(network: Network) {
    if (!network.caipId) {
      return Promise.reject({ error: rpcErrors.invalidParams(`Network must have a CAIP-2 id`) });
    }

    return getTokens({ caip2Id: network.caipId, proxyApiUrl: this.#proxyApiUrl });
  }

  // TODO
  async onRpcRequest(request: RpcRequest, network: Network) {
    switch (request.method) {
      case RpcMethod.SOLANA_SIGN_TRANSACTION: {
        return signTransaction({
          approvalController: this.#approvalController,
          proxyApiUrl: this.#proxyApiUrl,
          network,
          request,
          blockaid: this.#blockaid,
        });
      }
      case RpcMethod.SOLANA_SIGN_AND_SEND_TRANSACTION: {
        return signAndSendTransaction({
          approvalController: this.#approvalController,
          proxyApiUrl: this.#proxyApiUrl,
          network,
          request,
          blockaid: this.#blockaid,
        });
      }
      case RpcMethod.SOLANA_SIGN_MESSAGE: {
        return signMessage({
          approvalController: this.#approvalController,
          network,
          request,
        });
      }
    }
    return { error: rpcErrors.methodNotSupported(`Method ${request.method} not supported`) };
  }
}
