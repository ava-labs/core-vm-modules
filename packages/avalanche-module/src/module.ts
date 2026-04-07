import type { Avalanche } from '@avalabs/core-wallets-sdk';
import type {
  AppInfo,
  ApprovalController,
  BuildDerivationPathParams,
  ConstructorParams,
  DeriveAddressParams,
  DeriveAddressResponse,
  GetAddressParams,
  GetAddressResponse,
  GetBalancesParams,
  GetBalancesResponse,
  GetTransactionHistory,
  Manifest,
  Module,
  Network,
  NetworkFees,
  RpcRequest,
  RuntimeParams,
} from '@avalabs/vm-module-types';
import { parseManifest, RpcMethod } from '@avalabs/vm-module-types';
import { getCoreHeaders, TokenService } from '@internal/utils';
import { rpcErrors } from '@metamask/rpc-errors';
import ManifestJson from '../manifest.json';
import { getEnv } from './env';
import { avalancheSendTransaction } from './handlers/avalanche-send-transaction/avalanche-send-transaction';
import { avalancheSignMessage } from './handlers/avalanche-sign-message/avalanche-sign-message';
import { avalancheSignTransaction } from './handlers/avalanche-sign-transaction/avalanche-sign-transaction';
import { buildDerivationPath } from './handlers/build-derivation-path/build-derivation-path';
import { deriveAddress } from './handlers/derive-address/derive-address';
import { getAddress } from './handlers/get-address/get-address';
import { getBalances } from './handlers/get-balances/get-balances';
import { getNetworkFee } from './handlers/get-network-fee/get-network-fee';
import { getTransactionHistory } from './handlers/get-transaction-history/get-transaction-history';
import { AvalancheGlacierService } from './services/glacier-service/glacier-service';
import { getProvider } from './utils/get-provider';
import { hashBlockchainId } from './utils/hash-blockchain-id';

export class AvalancheModule implements Module {
  #glacierService: AvalancheGlacierService;
  #proxyApiUrl: string;
  #glacierApiUrl: string;
  #approvalController: ApprovalController;
  #appInfo: AppInfo;
  #runtime?: RuntimeParams;

  constructor({ approvalController, environment, appInfo, runtime }: ConstructorParams) {
    const { glacierApiUrl, proxyApiUrl } = getEnv(environment);
    this.#appInfo = appInfo;
    this.#runtime = runtime;
    this.#glacierService = new AvalancheGlacierService({
      glacierApiUrl,
      headers: getCoreHeaders(appInfo),
    });
    this.#proxyApiUrl = proxyApiUrl;
    this.#glacierApiUrl = glacierApiUrl;
    this.#approvalController = approvalController;
  }

  getProvider(network: Network): Promise<Avalanche.JsonRpcProvider> {
    return getProvider({
      isTestnet: Boolean(network.isTestnet),
      customRpcHeaders: network.customRpcHeaders,
    });
  }

  getAddress({ accountIndex, xpubXP, walletType, network }: GetAddressParams): Promise<GetAddressResponse> {
    return getAddress({
      accountIndex,
      xpubXP,
      walletType,
      network,
    });
  }

  getBalances({ addresses, network, storage, currency }: GetBalancesParams): Promise<GetBalancesResponse> {
    const tokenService = new TokenService({ storage, proxyApiUrl: this.#proxyApiUrl, fetch: this.#runtime?.fetch });
    return getBalances({ addresses, currency, network, glacierService: this.#glacierService, tokenService });
  }

  getManifest(): Manifest | undefined {
    const result = parseManifest(ManifestJson);
    return result.success ? result.data : undefined;
  }

  getNetworkFee(network: Network): Promise<NetworkFees> {
    const { isTestnet, vmName, customRpcHeaders } = network;
    return getNetworkFee({ isTestnet: Boolean(isTestnet), vmName, customRpcHeaders });
  }

  getTransactionHistory({ network, address, nextPageToken, offset }: GetTransactionHistory) {
    return getTransactionHistory({ network, address, nextPageToken, offset, glacierService: this.#glacierService });
  }

  getTokens(_: Network) {
    return Promise.resolve([]);
  }

  buildDerivationPath(params: BuildDerivationPathParams) {
    return buildDerivationPath(params);
  }

  async deriveAddress(params: DeriveAddressParams): Promise<DeriveAddressResponse> {
    return deriveAddress({
      ...params,
      approvalController: this.#approvalController,
    });
  }

  async onRpcRequest(request: RpcRequest, network: Network) {
    switch (request.method) {
      case RpcMethod.AVALANCHE_SIGN_MESSAGE:
        return avalancheSignMessage({ request, network, approvalController: this.#approvalController });
      case RpcMethod.AVALANCHE_SIGN_TRANSACTION:
        return avalancheSignTransaction({
          request,
          network,
          approvalController: this.#approvalController,
          glacierApiUrl: this.#glacierApiUrl,
          appInfo: this.#appInfo,
        });
      case RpcMethod.AVALANCHE_SEND_TRANSACTION:
        return avalancheSendTransaction({
          request,
          network,
          approvalController: this.#approvalController,
          glacierApiUrl: this.#glacierApiUrl,
          appInfo: this.#appInfo,
        });
      default:
        return { error: rpcErrors.methodNotSupported(`Method ${request.method} not supported`) };
    }
  }

  static getHashedBlockchainId({ blockchainId, isTestnet }: { blockchainId: string; isTestnet?: boolean }): string {
    return hashBlockchainId({ blockchainId, isTestnet });
  }
}
