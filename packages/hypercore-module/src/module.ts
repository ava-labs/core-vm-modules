import type {
  Module,
  Manifest,
  ConstructorParams,
  ApprovalController,
  RpcRequest,
  Network,
  NetworkFees,
  GetBalancesParams,
  GetAddressParams,
  GetAddressResponse,
  DeriveAddressParams,
  DeriveAddressesParams,
  BuildDerivationPathParams,
  GetTransactionHistory,
  NetworkFeeParam,
} from '@avalabs/vm-module-types';
import { parseManifest } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';

import ManifestJson from '../manifest.json';
import { getEnv } from './env';
import { HypercoreInfoClient } from './utils/info-client';
import { unsupportedHypercoreCapabilityMessage } from './utils/unsupported';
import { getBalances } from './handlers/get-balances/get-balances';
import { getTokens } from './handlers/get-tokens/get-tokens';
import { getTransactionHistory } from './handlers/get-transaction-history/get-transaction-history';
import { getAddress } from './handlers/get-address/get-address';
import { deriveAddress } from './handlers/derive-address/derive-address';
import { deriveAddresses } from './handlers/derive-addresses/derive-addresses';
import { buildDerivationPath } from './handlers/build-derivation-path/build-derivation-path';

export class HypercoreModule implements Module {
  #approvalController: ApprovalController;
  #infoClient: HypercoreInfoClient;

  constructor({ environment, approvalController, runtime }: ConstructorParams) {
    const { infoUrl, activityInfoUrl } = getEnv(environment);

    this.#approvalController = approvalController;
    this.#infoClient = new HypercoreInfoClient({
      infoUrl,
      activityInfoUrl,
      fetch: runtime?.fetch,
    });
  }

  getProvider(_network: Network): Promise<never> {
    return Promise.reject(new Error(unsupportedHypercoreCapabilityMessage('getProvider')));
  }

  getManifest(): Manifest | undefined {
    const result = parseManifest(ManifestJson);
    return result.success ? result.data : undefined;
  }

  getBalances(params: GetBalancesParams) {
    return getBalances({
      ...params,
      infoClient: this.#infoClient,
    });
  }

  getTransactionHistory(params: GetTransactionHistory) {
    return getTransactionHistory({
      ...params,
      infoClient: this.#infoClient,
    });
  }

  getNetworkFee(_network: NetworkFeeParam): Promise<NetworkFees> {
    return Promise.reject(new Error(unsupportedHypercoreCapabilityMessage('getNetworkFee')));
  }

  getAddress(params: GetAddressParams): Promise<GetAddressResponse> {
    return getAddress(params);
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

  deriveAddresses(params: DeriveAddressesParams) {
    return deriveAddresses({
      ...params,
      approvalController: this.#approvalController,
    });
  }

  getTokens(network: Network) {
    return getTokens({ network, infoClient: this.#infoClient });
  }

  async onRpcRequest(request: RpcRequest, _network: Network) {
    return {
      error: rpcErrors.methodNotSupported(`HyperCore is read-only; method ${request.method} is not supported`),
    };
  }
}
