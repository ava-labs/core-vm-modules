export type Chain = {
  isTestnet?: boolean;
  chainId?: string; // caip2ChainId
  chainName?: string;
  rpcUrl?: string;
  multiContractAddress?: string;
};

export type GetProviderParams = Chain & { glacierApiKey?: string };

export type Cache = {
  get: (id: string) => unknown;
  set: (id: string, data: unknown) => void;
};

export type Caip2ChainId = string;

export type Hex = `0x${string}`;

export enum Environment {
  PRODUCTION = 'production',
  DEV = 'dev',
}
