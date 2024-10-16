import {
  type Module,
  type Manifest,
  type NetworkFees,
  type GetTransactionHistory,
  type RpcRequest,
  type Network,
  type ApprovalController,
  type GetBalancesParams,
  type GetBalancesResponse,
  type GetAddressParams,
  type GetAddressResponse,
  RpcMethod,
  parseManifest,
  type ConstructorParams,
  type NetworkFeeParam,
} from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import { getTokens } from './handlers/get-tokens/get-tokens';
import { getNetworkFee } from './handlers/get-network-fee/get-network-fee';
import { getTransactionHistory } from './handlers/get-transaction-history/get-transaction-history';
import ManifestJson from '../manifest.json';
import { ethSendTransaction } from './handlers/eth-send-transaction/eth-send-transaction';
import { getBalances } from './handlers/get-balances/get-balances';
import { getEnv } from './env';
import { EvmGlacierService } from './services/glacier-service/glacier-service';
import { ethSign } from './handlers/eth-sign/eth-sign';
import { forwardToRpcNode } from './handlers/forward-to-rpc-node/forward-to-rpc-node';
import { getAddress } from './handlers/get-address/get-address';
import { DeBankService } from './services/debank-service/debank-service';
import type { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';
import { getProvider } from './utils/get-provider';
import { getCoreHeaders } from '@internal/utils';

export class EvmModule implements Module {
  #glacierService: EvmGlacierService;
  #deBankService: DeBankService;
  #proxyApiUrl: string;
  #approvalController: ApprovalController;

  constructor({ approvalController, environment, appInfo }: ConstructorParams) {
    const { glacierApiUrl, proxyApiUrl } = getEnv(environment);
    this.#glacierService = new EvmGlacierService({
      glacierApiUrl,
      headers: getCoreHeaders(appInfo),
    });
    this.#deBankService = new DeBankService({ proxyApiUrl });
    this.#proxyApiUrl = proxyApiUrl;
    this.#approvalController = approvalController;
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

  getBalances({
    addresses,
    network,
    currency,
    customTokens,
    storage,
    tokenTypes,
  }: GetBalancesParams): Promise<GetBalancesResponse> {
    return getBalances({
      addresses,
      currency,
      network,
      proxyApiUrl: this.#proxyApiUrl,
      customTokens,
      balanceServices: [this.#glacierService, this.#deBankService],
      storage,
      tokenTypes,
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
          proxyApiUrl: this.#proxyApiUrl,
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
          proxyApiUrl: this.#proxyApiUrl,
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
