import type {
  Module,
  Manifest,
  NetworkFees,
  GetTransactionHistory,
  RpcRequest,
  Network,
  GetBalancesParams,
  GetAddressParams,
  GetAddressResponse,
  ApprovalController,
  ConstructorParams,
  DeriveAddressParams,
} from '@avalabs/vm-module-types';
import { RpcMethod, parseManifest } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import { getEnv } from './env';

import ManifestJson from '../manifest.json';
import { getNetworkFee } from './handlers/get-network-fee/get-network-fee';
import { getTransactionHistory } from './handlers/get-transaction-history/get-transaction-history';
import { getBalances } from './handlers/get-balances/get-balances';
import { getAddress } from './handlers/get-address/get-address';
import { bitcoinSendTransaction } from './handlers/bitcoin-send-transaction/bitcoin-send-transaction';
import type { BitcoinProvider } from '@avalabs/core-wallets-sdk';
import { getProvider } from './utils/get-provider';
import { bitcoinSignTransaction } from './handlers/bitcoin-sign-transaction/bitcoin-sign-transaction';
import { deriveAddress } from './handlers/derive-address/derive-address';

export class BitcoinModule implements Module {
  #proxyApiUrl: string;
  #approvalController: ApprovalController;

  constructor({ environment, approvalController }: ConstructorParams) {
    const { proxyApiUrl } = getEnv(environment);

    this.#approvalController = approvalController;
    this.#proxyApiUrl = proxyApiUrl;
  }

  getProvider(network: Network): Promise<BitcoinProvider> {
    return getProvider({
      isTestnet: Boolean(network.isTestnet),
      proxyApiUrl: this.#proxyApiUrl,
    });
  }

  getAddress({ accountIndex, xpub, walletType, network }: GetAddressParams): Promise<GetAddressResponse> {
    return getAddress({ accountIndex, xpub, network, walletType });
  }

  deriveAddress(params: DeriveAddressParams) {
    return deriveAddress({
      ...params,
      approvalController: this.#approvalController,
    });
  }

  getBalances({ addresses, currency, network, storage }: GetBalancesParams) {
    return getBalances({
      addresses,
      currency,
      network,
      proxyApiUrl: this.#proxyApiUrl,
      storage,
    });
  }

  getManifest(): Manifest | undefined {
    const result = parseManifest(ManifestJson);
    return result.success ? result.data : undefined;
  }

  getNetworkFee(network: Network): Promise<NetworkFees> {
    return getNetworkFee({
      isTestnet: Boolean(network.isTestnet),
      proxyApiUrl: this.#proxyApiUrl,
    });
  }

  async getTransactionHistory({ address, network }: GetTransactionHistory) {
    return {
      transactions: await getTransactionHistory({
        address,
        network,
        proxyApiUrl: this.#proxyApiUrl,
      }),
    };
  }

  getTokens(_: Network) {
    return Promise.resolve([]);
  }

  async onRpcRequest(request: RpcRequest, network: Network) {
    switch (request.method) {
      case RpcMethod.BITCOIN_SEND_TRANSACTION:
        return bitcoinSendTransaction({
          request,
          network,
          approvalController: this.#approvalController,
          proxyApiUrl: this.#proxyApiUrl,
        });
      case RpcMethod.BITCOIN_SIGN_TRANSACTION:
        return bitcoinSignTransaction({
          request,
          network,
          approvalController: this.#approvalController,
          proxyApiUrl: this.#proxyApiUrl,
        });
      default:
        return { error: rpcErrors.methodNotSupported(`Method ${request.method} not supported`) };
    }
  }
}
