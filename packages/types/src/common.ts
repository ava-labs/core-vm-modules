import type { NetworkToken } from './token';

export type Network = {
  isTestnet?: boolean;
  chainId: string; // caip2ChainId
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
};

export type Storage = {
  get: <T>(id: string) => T;
  set: <T>(id: string, data: T) => void;
};

export type Caip2ChainId = string;

export type Hex = `0x${string}`;

export enum Environment {
  PRODUCTION = 'production',
  DEV = 'dev',
}
export type Error = {
  status: {
    error_code: number;
    error_message: string;
  };
};
