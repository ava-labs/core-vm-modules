import type {
  Module,
  Manifest,
  NetworkFees,
  GetTransactionHistory,
  RpcRequest,
  Environment,
  Network,
  ApprovalController,
  GetBalancesParams,
  GetBalancesResponse,
} from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import { RpcMethod, parseManifest } from '@avalabs/vm-module-types';
import { getTokens } from './handlers/get-tokens/get-tokens';
import { getNetworkFee } from './handlers/get-network-fee/get-network-fee';
import { getTransactionHistory } from './handlers/get-transaction-history/get-transaction-history';
import ManifestJson from '../manifest.json';
import { ethSendTransaction } from './handlers/eth-send-transaction/eth-send-transaction';
import { getBalances } from './handlers/get-balances/get-balances';
import { getEnv } from './env';
import { EvmGlacierService } from './services/glacier-service/glacier-service';
import { ethSign } from './handlers/eth-sign/eth-sign';

export class EvmModule implements Module {
  #glacierService: EvmGlacierService;
  #proxyApiUrl: string;
  #approvalController: ApprovalController;

  constructor({
    approvalController,
    environment,
  }: {
    approvalController: ApprovalController;
    environment: Environment;
  }) {
    const { glacierApiUrl, proxyApiUrl } = getEnv(environment);
    this.#glacierService = new EvmGlacierService({ glacierApiUrl });
    this.#proxyApiUrl = proxyApiUrl;
    this.#approvalController = approvalController;
  }

  getAddress(): Promise<string> {
    return Promise.resolve('EVM address');
  }

  getBalances({ addresses, network, currency, customTokens }: GetBalancesParams): Promise<GetBalancesResponse> {
    return getBalances({
      addresses,
      currency,
      network,
      proxyApiUrl: this.#proxyApiUrl,
      customTokens,
      glacierService: this.#glacierService,
    });
  }

  getManifest(): Manifest | undefined {
    const result = parseManifest(ManifestJson);
    return result.success ? result.data : undefined;
  }

  getNetworkFee(network: Network): Promise<NetworkFees> {
    const { chainId, chainName, rpcUrl, utilityAddresses } = network;
    return getNetworkFee({
      chainId,
      chainName,
      rpcUrl,
      multiContractAddress: utilityAddresses?.multicall,
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
        });
      default:
        return { error: rpcErrors.methodNotSupported(`Method ${request.method} not supported`) };
    }
  }
}
