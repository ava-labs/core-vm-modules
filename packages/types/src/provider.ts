import type { Eip1193Provider } from 'ethers';
import type EventEmitter from 'events';

export interface ChainChangedEventData {
  chainId: string;
  networkVersion: string;
}

export type AccountsChangedEventData = string[];

export interface UnlockStateChangedEventData {
  accounts: string[];
  isUnlocked: boolean;
}

export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: Eip1193Provider;
}

export enum EventNames {
  CORE_WALLET_ANNOUNCE_PROVIDER = 'core-wallet:announceProvider',
  CORE_WALLET_REQUEST_PROVIDER = 'core-wallet:requestProvider',
  EIP6963_ANNOUNCE_PROVIDER = 'eip6963:announceProvider',
  EIP6963_REQUEST_PROVIDER = 'eip6963:requestProvider',
}

export interface DomainMetadata {
  domain: string;
  name?: string;
  icon?: string;
  tabId?: number;
}

interface JsonRpcRequestPayloadBase<Method extends string> {
  readonly id: string;
  readonly method: Method;
  readonly site?: DomainMetadata;
  readonly tabId?: number;
}

interface JsonRpcRequestPayloadWithParams<Method extends string, Params = unknown>
  extends JsonRpcRequestPayloadBase<Method> {
  readonly params: Params;
}

interface JsonRpcRequestPayloadWithoutParams<Method extends string> extends JsonRpcRequestPayloadBase<Method> {
  readonly params?: never;
}

export type JsonRpcRequestPayload<Method extends string, Params = unknown> = Params extends undefined
  ? JsonRpcRequestPayloadWithoutParams<Method>
  : JsonRpcRequestPayloadWithParams<Method, Params>;

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export interface ChainAgnosticProvider extends EventEmitter {
  request({
    data,
    sessionId,
    chainId,
  }: {
    data: PartialBy<JsonRpcRequestPayload<string>, 'id' | 'params'>;
    sessionId: string;
    chainId: string | null;
  }): Promise<unknown>;

  subscribeToMessage(callback: ({ method, params }: { method: string; params: unknown }) => void): void;
}
