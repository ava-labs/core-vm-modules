import { z } from 'zod';
import {
  hyperEvmErc20TransferSchema,
  hyperEvmInternalTransactionSchema,
  hyperEvmNormalTransactionSchema,
  type HyperEvmErc20Transfer,
  type HyperEvmInternalTransaction,
  type HyperEvmNormalTransaction,
} from './schemas';

type EtherscanAction = 'txlist' | 'tokentx' | 'txlistinternal';

type EtherscanPageOptions = {
  page?: number;
  offset?: number;
};

export type HyperEvmEtherscanClientConfig = {
  proxyApiUrl: string;
  fetch?: typeof globalThis.fetch;
};

const resolveFetch = (fetchFn?: typeof globalThis.fetch) => {
  if (fetchFn) {
    return fetchFn;
  }

  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch.bind(globalThis);
  }

  throw new Error('HyperEvmEtherscanClient requires a fetch implementation');
};

export class HyperEvmEtherscanClient {
  readonly #apiUrl: string;
  readonly #fetch: typeof globalThis.fetch;

  constructor({ proxyApiUrl, fetch }: HyperEvmEtherscanClientConfig) {
    this.#apiUrl = `${proxyApiUrl}/proxy/etherscan/hyperevm/api`;
    this.#fetch = resolveFetch(fetch);
  }

  listNormalTransactions(address: string, options?: EtherscanPageOptions) {
    return this.#list('txlist', address, hyperEvmNormalTransactionSchema, options);
  }

  listErc20Transfers(address: string, options?: EtherscanPageOptions) {
    return this.#list('tokentx', address, hyperEvmErc20TransferSchema, options);
  }

  listInternalTransactions(address: string, options?: EtherscanPageOptions) {
    return this.#list('txlistinternal', address, hyperEvmInternalTransactionSchema, options);
  }

  async #list<T>(
    action: EtherscanAction,
    address: string,
    schema: z.ZodType<T>,
    options?: EtherscanPageOptions,
  ): Promise<T[]> {
    const params = new URLSearchParams({
      module: 'account',
      action,
      address,
      page: (options?.page ?? 1).toString(),
      offset: (options?.offset ?? 25).toString(),
      sort: 'desc',
    });
    const response = await this.#fetch(`${this.#apiUrl}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`HyperEVM explorer request failed: ${response.status} ${response.statusText}`);
    }

    const json: unknown = await response.json();
    const parsed = z
      .object({
        status: z.string(),
        message: z.string(),
        result: z.union([z.array(schema), z.string()]),
      })
      .parse(json);

    if (Array.isArray(parsed.result)) {
      return parsed.result;
    }

    if (parsed.status === '0' && parsed.message === 'No transactions found') {
      return [];
    }

    throw new Error(parsed.result);
  }
}

export type { HyperEvmErc20Transfer, HyperEvmInternalTransaction, HyperEvmNormalTransaction };
