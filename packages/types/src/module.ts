import type { Avalanche, BitcoinProvider, JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';
import type { GetAddressParams, GetAddressResponse } from './account';
import type { GetBalancesParams, GetBalancesResponse } from './balance';
import type { Network } from './common';
import type { Manifest } from './manifest';
import type { NetworkFees } from './network-fee';
import type { RpcRequest, RpcResponse } from './rpc';
import type { NetworkContractToken } from './token';
import type { GetTransactionHistory, TransactionHistoryResponse } from './transaction-history';

export interface Module {
  getProvider: (network: Network) => JsonRpcBatchInternal | BitcoinProvider | Avalanche.JsonRpcProvider;
  getManifest: () => Manifest | undefined;
  getBalances: (params: GetBalancesParams) => Promise<GetBalancesResponse>;
  getTransactionHistory: (params: GetTransactionHistory) => Promise<TransactionHistoryResponse>;
  getNetworkFee: (network: Network) => Promise<NetworkFees>;
  getAddress: (params: GetAddressParams) => Promise<GetAddressResponse>;
  getTokens: (network: Network) => Promise<NetworkContractToken[]>;
  onRpcRequest: (request: RpcRequest, chain: Network) => Promise<RpcResponse>;
}
