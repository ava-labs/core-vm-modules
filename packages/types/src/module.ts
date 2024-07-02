import type { GetBalancesParams, GetBalancesResponse } from './balance';
import type { Manifest } from './manifest';
import type { GetNetworkFeeParams, NetworkFees } from './network-fee';
import type { RpcRequest, RpcResponse } from './rpc';
import type { NetworkContractToken } from './token';
import type { GetTransactionHistory, TransactionHistoryResponse } from './transaction-history';

export interface Module {
  getManifest: () => Manifest | undefined;
  getBalances: (params: GetBalancesParams) => Promise<GetBalancesResponse>;
  getTransactionHistory: (params: GetTransactionHistory) => Promise<TransactionHistoryResponse>;
  getNetworkFee: (params: GetNetworkFeeParams) => Promise<NetworkFees>;
  getAddress: () => Promise<string>;
  getTokens: (chainId: number) => Promise<NetworkContractToken[]>;
  onRpcRequest: (request: RpcRequest) => Promise<RpcResponse>;
}
