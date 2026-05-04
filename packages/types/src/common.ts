import type { NetworkContractToken, NetworkToken } from './token';

export type Network = {
  isTestnet?: boolean;
  isDevnet?: boolean;
  chainId: number;
  caipId?: string;
  chainName: string;
  rpcUrl: string;
  customRpcHeaders?: Record<string, string>;
  utilityAddresses?: {
    multicall: string;
  };
  networkToken: NetworkToken;
  pricingProviders?: {
    coingecko: {
      assetPlatformId?: string;
      nativeTokenId?: string;
    };
  };
  tokens?: NetworkContractToken[];
  explorerUrl?: string;
  logoUri?: string;
  vmName: NetworkVMType;
  vmRpcPrefix?: string;
};

export enum NetworkVMType {
  EVM = 'EVM',
  BITCOIN = 'BITCOIN',
  AVM = 'AVM',
  PVM = 'PVM',
  CoreEth = 'CoreEth',
  HVM = 'HVM',
  SVM = 'SVM',
}

export type Storage = {
  get: <T>(id: string) => T | undefined;
  set: <T>(id: string, data: T) => void;
};

export type Caip2ChainId = string;

export type Hex = `0x${string}`;

export enum Environment {
  PRODUCTION = 'production',
  DEV = 'dev',
}

export enum AppName {
  CORE_MOBILE_IOS = 'core-mobile-ios',
  CORE_MOBILE_ANDROID = 'core-mobile-android',
  CORE_WEB = 'core-web',
  CORE_EXTENSION = 'core-extension',
  EXPLORER = 'explorer',
  OTHER = 'other',
}
