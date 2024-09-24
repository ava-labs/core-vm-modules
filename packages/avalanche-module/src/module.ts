import type {
  Module,
  Manifest,
  NetworkFees,
  GetTransactionHistory,
  RpcRequest,
  Network,
  GetBalancesParams,
  GetBalancesResponse,
  GetAddressParams,
  GetAddressResponse,
  ApprovalController,
  ConstructorParams,
} from '@avalabs/vm-module-types';
import { parseManifest, RpcMethod } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import ManifestJson from '../manifest.json';
import { getNetworkFee } from './handlers/get-network-fee/get-network-fee';
import { getTransactionHistory } from './handlers/get-transaction-history/get-transaction-history';
import { getEnv } from './env';
import { AvalancheGlacierService } from './services/glacier-service/glacier-service';
import { getCoreHeaders, TokenService } from '@internal/utils';
import { getBalances } from './handlers/get-balances/get-balances';
import { hashBlockchainId } from './utils/hash-blockchain-id';
import { getAddress } from './handlers/get-address/get-address';
import { avalancheSignMessage } from './handlers/avalanche-sign-message/avalanche-sign-message';
import { avalancheSendTransaction } from './handlers/avalanche-send-transaction/avalanche-send-transaction';
import { avalancheSignTransaction } from './handlers/avalanche-sign-transaction/avalanche-sign-transaction';
import type { Avalanche } from '@avalabs/core-wallets-sdk';
import { getProvider } from './utils/get-provider';

export class AvalancheModule implements Module {
  #glacierService: AvalancheGlacierService;
  #proxyApiUrl: string;
  #glacierApiUrl: string;
  #approvalController: ApprovalController;

  constructor({ approvalController, environment, appInfo }: ConstructorParams) {
    const { glacierApiUrl, proxyApiUrl } = getEnv(environment);
    this.#glacierService = new AvalancheGlacierService({
      glacierApiUrl,
      headers: getCoreHeaders(appInfo),
    });
    this.#proxyApiUrl = proxyApiUrl;
    this.#glacierApiUrl = glacierApiUrl;
    this.#approvalController = approvalController;
  }

  getProvider(network: Network): Avalanche.JsonRpcProvider {
    return getProvider({ isTestnet: Boolean(network.isTestnet) });
  }

  getAddress({ accountIndex, xpubXP, isTestnet, walletType }: GetAddressParams): Promise<GetAddressResponse> {
    return getAddress({ accountIndex, xpubXP, isTestnet, walletType });
  }

  getBalances({ addresses, network, storage, currency }: GetBalancesParams): Promise<GetBalancesResponse> {
    const tokenService = new TokenService({ storage, proxyApiUrl: this.#proxyApiUrl });
    return getBalances({ addresses, currency, network, glacierService: this.#glacierService, tokenService });
  }

  getManifest(): Manifest | undefined {
    const result = parseManifest(ManifestJson);
    return result.success ? result.data : undefined;
  }

  getNetworkFee(_: Network): Promise<NetworkFees> {
    return getNetworkFee();
  }

  getTransactionHistory({ network, address, nextPageToken, offset }: GetTransactionHistory) {
    return getTransactionHistory({ network, address, nextPageToken, offset, glacierService: this.#glacierService });
  }

  getTokens(_: Network) {
    return Promise.resolve([]);
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
        });
      case RpcMethod.AVALANCHE_SEND_TRANSACTION:
        return avalancheSendTransaction({
          request,
          network,
          approvalController: this.#approvalController,
          glacierApiUrl: this.#glacierApiUrl,
        });
      default:
        return { error: rpcErrors.methodNotSupported(`Method ${request.method} not supported`) };
    }
  }

  static getHashedBlockchainId({ blockchainId, isTestnet }: { blockchainId: string; isTestnet?: boolean }): string {
    return hashBlockchainId({ blockchainId, isTestnet });
  }
}
