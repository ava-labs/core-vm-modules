import type { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';
import {
  parseManifest,
  RpcMethod,
  type ApprovalController,
  type BuildDerivationPathParams,
  type ConstructorParams,
  type DeriveAddressesParams,
  type DeriveAddressesResponse,
  type DeriveAddressParams,
  type DeriveAddressResponse,
  type GetAddressParams,
  type GetAddressResponse,
  type GetBalancesParams,
  type GetBalancesResponse,
  type GetTransactionHistory,
  type Manifest,
  type Module,
  type Network,
  type NetworkFeeParam,
  type NetworkFees,
  type RpcRequest,
  type RuntimeParams,
} from '@avalabs/vm-module-types';
import Blockaid from '@blockaid/client';
import { getCoreHeaders, TokenService } from '@internal/utils';
import { rpcErrors } from '@metamask/rpc-errors';
import ManifestJson from '../manifest.json';
import { BLOCKAID_API_KEY } from './constants';
import { getEnv } from './env';
import { buildDerivationPath } from './handlers/build-derivation-path/build-derivation-path';
import { avalancheDeclareAgentIdentity } from './handlers/avalanche-declare-agent-identity/avalanche-declare-agent-identity';
import { deriveAddress } from './handlers/derive-address/derive-address';
import { deriveAddresses } from './handlers/derive-addresses/derive-addresses';
import { ethSendTransactionBatch } from './handlers/eth-send-transaction-batch/eth-send-transaction-batch';
import { ethSendTransaction } from './handlers/eth-send-transaction/eth-send-transaction';
import { ethSign } from './handlers/eth-sign/eth-sign';
import { forwardToRpcNode } from './handlers/forward-to-rpc-node/forward-to-rpc-node';
import { getAddress } from './handlers/get-address/get-address';
import { getBalances } from './handlers/get-balances/get-balances';
import { getNetworkFee } from './handlers/get-network-fee/get-network-fee';
import { getTokens } from './handlers/get-tokens/get-tokens';
import { getTransactionHistory } from './handlers/get-transaction-history/get-transaction-history';
import { DeBankService } from './services/debank-service/debank-service';
import { EvmGlacierService } from './services/glacier-service/glacier-service';
import { getProvider } from './utils/get-provider';
import { supportsBatchApprovals } from './utils/type-utils';
import { HyperEvmEtherscanClient } from './services/hyperevm-etherscan-client/hyperevm-etherscan-client';

/** EVM-specific feature toggles, resolved from the consumer's feature-flag source. */
type EvmModuleFeatures = {
  encryptedERCs: boolean;
};

/** EVM module runtime params: the shared ones plus EVM-specific feature toggles. */
type EvmRuntimeParams = RuntimeParams & {
  features?: Partial<EvmModuleFeatures>;
};

type EvmConstructorParams = Omit<ConstructorParams, 'runtime'> & {
  /**
   * Required: the module's internal Glacier calls (EVM balances, transaction
   * history) go through core-proxy-api, which rejects requests without auth
   * headers (Firebase AppCheck) — so `getAuthHeaders` must be supplied.
   */
  runtime: EvmRuntimeParams & Required<Pick<RuntimeParams, 'getAuthHeaders'>>;
};

export class EvmModule implements Module {
  #glacierService: EvmGlacierService;
  #deBankService: DeBankService;
  #proxyApiUrl: string;
  #approvalController: ApprovalController;
  #blockaid: Blockaid;
  #runtime?: EvmRuntimeParams;
  #hyperEvmEtherscanClient: HyperEvmEtherscanClient;

  constructor({ approvalController, environment, appInfo, runtime }: EvmConstructorParams) {
    const { glacierApiUrl, proxyApiUrl } = getEnv(environment);
    this.#runtime = runtime;
    this.#glacierService = new EvmGlacierService({
      glacierApiUrl,
      headers: getCoreHeaders(appInfo),
      // Reads #runtime at call time so updateRuntimeParams() is respected.
      getAuthHeaders: async () => this.#runtime?.getAuthHeaders?.(),
    });
    this.#deBankService = new DeBankService({ proxyApiUrl, fetch: this.#runtime?.fetch });
    this.#proxyApiUrl = proxyApiUrl;
    this.#hyperEvmEtherscanClient = new HyperEvmEtherscanClient({
      proxyApiUrl,
      fetch: this.#runtime?.fetch,
    });
    this.#approvalController = approvalController;
    this.#blockaid = new Blockaid({
      baseURL: proxyApiUrl + '/proxy/blockaid/',
      apiKey: BLOCKAID_API_KEY,
      httpAgent: runtime?.httpAgent,
      fetch: runtime?.fetch,
    });
  }

  /**
   * Applies a partial update to the module's runtime params, overriding only the
   * provided keys (nested `features` are merged, not replaced). The module is
   * constructed once, so the consumer uses this to push later changes (e.g. flags).
   */
  updateRuntimeParams(params: Partial<EvmRuntimeParams>): void {
    this.#runtime = {
      ...this.#runtime,
      ...params,
      features: {
        ...this.#runtime?.features,
        ...params.features,
      },
    };
  }

  getProvider(network: Network): Promise<JsonRpcBatchInternal> {
    return getProvider({
      chainId: network.chainId,
      chainName: network.chainName,
      rpcUrl: network.rpcUrl,
      multiContractAddress: network.utilityAddresses?.multicall,
      pollingInterval: 1000,
      customRpcHeaders: network.customRpcHeaders,
    });
  }

  getAddress({ accountIndex, xpub, walletType }: GetAddressParams): Promise<GetAddressResponse> {
    return getAddress({ accountIndex, xpub, walletType });
  }

  buildDerivationPath(params: BuildDerivationPathParams) {
    return buildDerivationPath(params);
  }

  deriveAddress(params: DeriveAddressParams): Promise<DeriveAddressResponse> {
    return deriveAddress({
      ...params,
      approvalController: this.#approvalController,
    });
  }

  deriveAddresses(params: DeriveAddressesParams): Promise<DeriveAddressesResponse> {
    return deriveAddresses({
      ...params,
      approvalController: this.#approvalController,
    });
  }

  getBalances({
    addresses,
    network,
    currency,
    customTokens,
    storage,
    tokenTypes,
    customTokensOnly,
  }: GetBalancesParams): Promise<GetBalancesResponse> {
    const tokenService = new TokenService({ storage, proxyApiUrl: this.#proxyApiUrl, fetch: this.#runtime?.fetch });
    return getBalances({
      addresses,
      currency,
      network,
      proxyApiUrl: this.#proxyApiUrl,
      customTokens,
      customTokensOnly,
      balanceServices: [this.#glacierService, this.#deBankService],
      storage,
      tokenTypes,
      tokenService,
      fetch: this.#runtime?.fetch,
    });
  }

  getManifest(): Manifest | undefined {
    const result = parseManifest(ManifestJson);
    return result.success ? result.data : undefined;
  }

  getNetworkFee(network: NetworkFeeParam): Promise<NetworkFees> {
    const { chainId, chainName, rpcUrl, utilityAddresses, caipId, customRpcHeaders } = network;
    return getNetworkFee({
      chainId,
      chainName,
      rpcUrl,
      multiContractAddress: utilityAddresses?.multicall,
      caipId,
      proxyApiUrl: this.#proxyApiUrl,
      customRpcHeaders,
    });
  }

  getTransactionHistory(params: GetTransactionHistory) {
    const { network, address, nextPageToken, offset } = params;
    const { chainId, networkToken, explorerUrl = '' } = network;

    return getTransactionHistory({
      chainId,
      networkToken,
      explorerUrl,
      address,
      nextPageToken,
      offset,
      glacierService: this.#glacierService,
      hyperEvmEtherscanClient: this.#hyperEvmEtherscanClient,
    });
  }

  getTokens(network: Network) {
    const { chainId } = network;
    return getTokens({ chainId, proxyApiUrl: this.#proxyApiUrl });
  }

  async onRpcRequest(request: RpcRequest, network: Network) {
    switch (request.method) {
      case RpcMethod.ETH_SEND_TRANSACTION:
        return ethSendTransaction({
          request,
          network,
          approvalController: this.#approvalController,
          blockaid: this.#blockaid,
          eercEnabled: this.#runtime?.features?.encryptedERCs === true,
        });
      case RpcMethod.ETH_SEND_TRANSACTION_BATCH: {
        if (!supportsBatchApprovals(this.#approvalController)) {
          return {
            error: rpcErrors.methodNotSupported(`Method ${request.method} requires BatchApprovalController`),
          };
        }

        return ethSendTransactionBatch({
          request,
          network,
          approvalController: this.#approvalController,
          blockaid: this.#blockaid,
        });
      }
      case RpcMethod.AVALANCHE_DECLARE_AGENT_IDENTITY:
        return avalancheDeclareAgentIdentity({
          request,
          network,
        });
      case RpcMethod.PERSONAL_SIGN:
      case RpcMethod.ETH_SIGN:
      case RpcMethod.SIGN_TYPED_DATA:
      case RpcMethod.SIGN_TYPED_DATA_V1:
      case RpcMethod.SIGN_TYPED_DATA_V3:
      case RpcMethod.SIGN_TYPED_DATA_V4:
        return ethSign({
          request,
          network,
          approvalController: this.#approvalController,
          blockaid: this.#blockaid,
        });
      default:
        if (shouldForwardToRpcNode(request.method)) {
          return forwardToRpcNode(request, network);
        }

        return { error: rpcErrors.methodNotSupported(`Method ${request.method} not supported`) };
    }
  }
}

const shouldForwardToRpcNode = (method: RpcMethod) => {
  return (
    method.startsWith('eth_') ||
    ['web3_clientVersion', 'web3_sha3', 'net_version', 'net_peerCount', 'net_listening'].includes(method)
  );
};
