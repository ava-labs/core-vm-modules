import type { Avalanche, BitcoinProvider, JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';
import type {
  BuildDerivationPathParams,
  BuildDerivationPathResponse,
  DeriveAddressParams,
  DeriveAddressResponse,
  GetAddressParams,
  GetAddressResponse,
} from './account';
import type { GetBalancesParams, GetBalancesResponse } from './balance';
import { AppName, Environment, type Network } from './common';
import type { Manifest } from './manifest';
import type { NetworkFees } from './network-fee';
import type { RpcRequest, RpcResponse } from './rpc';
import type { NetworkContractToken } from './token';
import type { GetTransactionHistory, TransactionHistoryResponse } from './transaction-history';
import type { ApprovalController } from './rpc';
import type { HyperSDKClient } from 'hypersdk-client';
import type {
  Rpc,
  RpcDevnet,
  RpcMainnet,
  RpcTestnet,
  SolanaRpcApiDevnet,
  SolanaRpcApiMainnet,
  SolanaRpcApiTestnet,
} from '@solana/rpc';

export type AppInfo = {
  name: AppName;
  version: string;
};

export type ConstructorParams = {
  approvalController: ApprovalController;
  environment: Environment;
  appInfo: AppInfo;
};

export type SVMProvider =
  | Rpc<SolanaRpcApiMainnet | SolanaRpcApiMainnet>
  | RpcDevnet<SolanaRpcApiDevnet | SolanaRpcApiMainnet>
  | RpcMainnet<SolanaRpcApiMainnet | SolanaRpcApiMainnet>
  | RpcTestnet<SolanaRpcApiTestnet | SolanaRpcApiMainnet>;

export type NetworkFeeParam = Network & { caipId?: string };

export interface Module {
  getProvider: (
    network: Network,
  ) => Promise<JsonRpcBatchInternal | BitcoinProvider | Avalanche.JsonRpcProvider | HyperSDKClient | SVMProvider>;
  getManifest: () => Manifest | undefined;
  getBalances: (params: GetBalancesParams) => Promise<GetBalancesResponse>;
  getTransactionHistory: (params: GetTransactionHistory) => Promise<TransactionHistoryResponse>;
  getNetworkFee: (network: NetworkFeeParam) => Promise<NetworkFees>;
  /**
   * @deprecated Please use `deriveAddress` instead
   */
  getAddress: (params: GetAddressParams) => Promise<GetAddressResponse>;
  deriveAddress: (params: DeriveAddressParams) => Promise<DeriveAddressResponse>;
  buildDerivationPath: (params: BuildDerivationPathParams) => BuildDerivationPathResponse;
  getTokens: (network: Network) => Promise<NetworkContractToken[]>;
  onRpcRequest: (request: RpcRequest, chain: Network) => Promise<RpcResponse>;
}
