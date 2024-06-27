export type Chain = {
  isTestnet?: boolean;
  chainId?: string;
  chainName?: string;
  rpcUrl?: string;
  multiContractAddress?: string;
};

export type GetProviderParams = Chain & { glacierApiKey?: string };

export type GetCache = (id: string) => unknown;
export type SetCache = (id: string, data: unknown) => void;
export type CacheProviderParams = {
  getCache?: GetCache;
  setCache?: SetCache;
};

export type Caip2ChainId = string;

export type Hex = `0x${string}`;

export enum Environment {
  PRODUCTION = 'production',
  DEV = 'dev',
}
