import type { Avalanche, BitcoinProvider, JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';
import type { GetAddressParams, GetAddressResponse } from './account';
import type { GetBalancesParams, GetBalancesResponse, HvmGetBalanceParams } from './balance';
import { AppName, Environment, type Network } from './common';
import type { Manifest } from './manifest';
import type { NetworkFees } from './network-fee';
import type { RpcRequest, RpcResponse } from './rpc';
import type { NetworkContractToken } from './token';
import type { GetTransactionHistory, TransactionHistoryResponse } from './transaction-history';
import type { ApprovalController } from './rpc';
import type { HyperSDKClient } from 'hypersdk-client';

export type AppInfo = {
  name: AppName;
  version: string;
};

export type ConstructorParams = {
  approvalController: ApprovalController;
  environment: Environment;
  appInfo: AppInfo;
};

export type NetworkFeeParam = Network & { caipId?: string };

export interface Module {
  getProvider: (
    network: Network,
  ) => Promise<JsonRpcBatchInternal | BitcoinProvider | Avalanche.JsonRpcProvider | HyperSDKClient>;
  getManifest: () => Manifest | undefined;
  getBalances: (params: GetBalancesParams | HvmGetBalanceParams) => Promise<GetBalancesResponse>;
  getTransactionHistory: (params: GetTransactionHistory) => Promise<TransactionHistoryResponse>;
  getNetworkFee: (network: NetworkFeeParam) => Promise<NetworkFees>;
  getAddress: (params: GetAddressParams) => Promise<GetAddressResponse>;
  getTokens: (network: Network) => Promise<NetworkContractToken[]>;
  onRpcRequest: (request: RpcRequest, chain: Network) => Promise<RpcResponse>;
}
