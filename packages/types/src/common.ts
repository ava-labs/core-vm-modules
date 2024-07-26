import type { NetworkToken } from './token';

export type Network = {
  isTestnet?: boolean;
  chainId: number;
  chainName: string;
  rpcUrl: string;
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
  explorerUrl?: string;
  logoUri?: string;
  vmName: NetworkVMType;
};

export enum NetworkVMType {
  EVM = 'EVM',
  BITCOIN = 'BITCOIN',
  AVM = 'AVM',
  PVM = 'PVM',
  CoreEth = 'CoreEth',
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
