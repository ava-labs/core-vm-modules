import type { GetBalancesParams, GetBalancesResponse } from './balance';
import type { Network } from './common';
import type { Manifest } from './manifest';
import type { NetworkFees } from './network-fee';
import type { RpcRequest, RpcResponse } from './rpc';
import type { NetworkContractToken } from './token';
import type { GetTransactionHistory, TransactionHistoryResponse } from './transaction-history';

export interface Module {
  getManifest: () => Manifest | undefined;
  getBalances: (params: GetBalancesParams) => Promise<GetBalancesResponse>;
  getTransactionHistory: (params: GetTransactionHistory) => Promise<TransactionHistoryResponse>;
  getNetworkFee: (network: Network) => Promise<NetworkFees>;
  getAddress: () => Promise<string>;
  getTokens: (network: Network) => Promise<NetworkContractToken[]>;
  onRpcRequest: (request: RpcRequest, chain: Network) => Promise<RpcResponse>;
}
