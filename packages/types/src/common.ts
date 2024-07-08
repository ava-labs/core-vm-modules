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
};

export type GetProviderParams = { glacierApiKey?: string; network: Network };

export type Storage = {
  get: (id: string) => unknown;
  set: (id: string, data: unknown) => void;
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
