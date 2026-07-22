import type { z } from 'zod';
import type Big from 'big.js';
import {
  clearinghouseStateSchema,
  hypercoreLedgerUpdatesSchema,
  spotClearinghouseStateSchema,
  spotMetaResponseSchema,
  userAbstractionSchema,
  userFillsSchema,
  type ClearinghouseState,
  type HypercoreLedgerUpdate,
  type SpotClearinghouseState,
  type SpotMetaResponse,
  type UserAbstractionMode,
  type UserFill,
} from './schemas';
import { getWithdrawableUsd } from './get-withdrawable-usd';

export type HypercoreInfoRequest =
  | { type: 'spotMeta' }
  | { type: 'spotClearinghouseState'; user: string; dex?: string }
  | { type: 'clearinghouseState'; user: string; dex?: string }
  | { type: 'userAbstraction'; user: string }
  | { type: 'userFills'; user: string }
  | {
      type: 'userNonFundingLedgerUpdates';
      user: string;
      startTime: number;
    };

export type HypercoreInfoClientConfig = {
  /** Proxy-first `/info` URL used for balances and spot meta. */
  infoUrl: string;
  /**
   * Activity URL. Defaults to `infoUrl`; may be the public HL endpoint when
   * the proxy does not yet support fills/ledger types.
   */
  activityInfoUrl?: string;
  fetch?: typeof globalThis.fetch;
};

export type PostInfoOptions = {
  signal?: AbortSignal;
  /** Overrides the client default URL for this call. */
  url?: string;
};

export type HypercoreWithdrawableState = {
  withdrawableUsd: Big;
  abstractionMode: UserAbstractionMode | undefined;
  clearinghouse: ClearinghouseState | undefined;
  spotClearinghouse: SpotClearinghouseState | undefined;
};

const resolveFetch = (fetchFn?: typeof globalThis.fetch): typeof globalThis.fetch => {
  if (typeof fetchFn === 'function') {
    return fetchFn;
  }

  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch.bind(globalThis);
  }

  throw new Error(
    'HypercoreInfoClient requires a fetch implementation. Pass config.fetch when globalThis.fetch is unavailable (e.g. React Native).',
  );
};

export class HypercoreInfoClient {
  readonly #infoUrl: string;
  readonly #activityInfoUrl: string;
  readonly #fetch: typeof globalThis.fetch;

  constructor(config: HypercoreInfoClientConfig) {
    this.#infoUrl = config.infoUrl;
    this.#activityInfoUrl = config.activityInfoUrl ?? config.infoUrl;
    this.#fetch = resolveFetch(config.fetch);
  }

  async postInfo<T>(body: HypercoreInfoRequest, schema: z.ZodType<T>, options?: PostInfoOptions) {
    const response = await this.#fetch(options?.url ?? this.#infoUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    if (!response.ok) {
      throw new Error(`Hyperliquid /info failed: ${response.status} ${response.statusText}`);
    }

    const json: unknown = await response.json();
    return schema.parse(json);
  }

  getSpotMeta(options?: PostInfoOptions): Promise<SpotMetaResponse> {
    return this.postInfo({ type: 'spotMeta' }, spotMetaResponseSchema, options);
  }

  getSpotClearinghouseState(user: string, options?: PostInfoOptions): Promise<SpotClearinghouseState> {
    return this.postInfo(
      {
        type: 'spotClearinghouseState',
        user: user.toLowerCase(),
        dex: '',
      },
      spotClearinghouseStateSchema,
      options,
    ) as Promise<SpotClearinghouseState>;
  }

  getClearinghouseState(user: string, options?: PostInfoOptions): Promise<ClearinghouseState> {
    return this.postInfo(
      {
        type: 'clearinghouseState',
        user: user.toLowerCase(),
        dex: '',
      },
      clearinghouseStateSchema,
      options,
    );
  }

  getUserAbstraction(user: string, options?: PostInfoOptions): Promise<UserAbstractionMode> {
    return this.postInfo(
      { type: 'userAbstraction', user: user.toLowerCase() },
      userAbstractionSchema,
      options,
    ) as Promise<UserAbstractionMode>;
  }

  /**
   * Fetches clearinghouse + spot + abstraction and returns Hyperliquid's
   * withdrawable USD (unified accounts include free spot USDC).
   *
   * Partial `/info` failures degrade gracefully (missing legs → 0 contribution).
   */
  async fetchWithdrawableState(user: string, options?: PostInfoOptions): Promise<HypercoreWithdrawableState> {
    const normalized = user.toLowerCase();
    const [clearinghouse, spotClearinghouse, abstractionMode] = await Promise.all([
      this.getClearinghouseState(normalized, options).catch(() => undefined),
      this.getSpotClearinghouseState(normalized, options).catch(() => undefined),
      this.getUserAbstraction(normalized, options).catch(() => undefined),
    ]);

    return {
      withdrawableUsd: getWithdrawableUsd(clearinghouse, spotClearinghouse, abstractionMode),
      abstractionMode,
      clearinghouse,
      spotClearinghouse,
    };
  }

  getUserFills(user: string, options?: PostInfoOptions): Promise<UserFill[]> {
    return this.postInfo({ type: 'userFills', user: user.toLowerCase() }, userFillsSchema, {
      ...options,
      url: options?.url ?? this.#activityInfoUrl,
    });
  }

  getUserNonFundingLedgerUpdates(
    user: string,
    startTime: number,
    options?: PostInfoOptions,
  ): Promise<HypercoreLedgerUpdate[]> {
    return this.postInfo(
      {
        type: 'userNonFundingLedgerUpdates',
        user: user.toLowerCase(),
        startTime,
      },
      hypercoreLedgerUpdatesSchema,
      {
        ...options,
        url: options?.url ?? this.#activityInfoUrl,
      },
    );
  }
}
