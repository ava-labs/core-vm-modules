import type { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';
import {
  parseManifest,
  RpcMethod,
  type ApprovalController,
  type BuildDerivationPathParams,
  type ConstructorParams,
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
import { deriveAddress } from './handlers/derive-address/derive-address';
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

export class EvmModule implements Module {
  #glacierService: EvmGlacierService;
  #deBankService: DeBankService;
  #proxyApiUrl: string;
  #approvalController: ApprovalController;
  #blockaid: Blockaid;
  #runtime?: RuntimeParams;

  constructor({ approvalController, environment, appInfo, runtime }: ConstructorParams) {
    const { glacierApiUrl, proxyApiUrl } = getEnv(environment);
    this.#runtime = runtime;
    this.#glacierService = new EvmGlacierService({
      glacierApiUrl,
      headers: getCoreHeaders(appInfo),
    });
    this.#deBankService = new DeBankService({ proxyApiUrl, fetch: this.#runtime?.fetch });
    this.#proxyApiUrl = proxyApiUrl;
    this.#approvalController = approvalController;
    this.#blockaid = new Blockaid({
      baseURL: proxyApiUrl + '/proxy/blockaid/',
      apiKey: BLOCKAID_API_KEY,
      httpAgent: runtime?.httpAgent,
      fetch: runtime?.fetch,
    });
  }

  getProvider(network: Network): Promise<JsonRpcBatchInternal> {
    return getProvider({
      chainId: network.chainId,
      chainName: network.chainName,
      rpcUrl: network.rpcUrl,
      multiContractAddress: network.utilityAddresses?.multicall,
      pollingInterval: 1000,
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

  getBalances({
    addresses,
    network,
    currency,
    customTokens,
    storage,
    tokenTypes,
  }: GetBalancesParams): Promise<GetBalancesResponse> {
    const tokenService = new TokenService({ storage, proxyApiUrl: this.#proxyApiUrl, fetch: this.#runtime?.fetch });
    return getBalances({
      addresses,
      currency,
      network,
      proxyApiUrl: this.#proxyApiUrl,
      customTokens,
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
    const { chainId, chainName, rpcUrl, utilityAddresses, caipId } = network;
    return getNetworkFee({
      chainId,
      chainName,
      rpcUrl,
      multiContractAddress: utilityAddresses?.multicall,
      caipId,
      proxyApiUrl: this.#proxyApiUrl,
    });
  }

  getTransactionHistory(params: GetTransactionHistory) {
    const { network, address, nextPageToken, offset } = params;
    const { chainId, isTestnet, networkToken, explorerUrl = '' } = network;

    return getTransactionHistory({
      chainId,
      isTestnet,
      networkToken,
      explorerUrl,
      address,
      nextPageToken,
      offset,
      glacierService: this.#glacierService,
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
