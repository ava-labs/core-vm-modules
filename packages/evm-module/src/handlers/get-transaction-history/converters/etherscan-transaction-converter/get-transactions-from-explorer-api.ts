import type { NormalTx, Erc20Tx } from '@avalabs/core-etherscan-sdk';
import type { NetworkToken, TransactionHistoryResponse } from '@avalabs/vm-module-types';
import { convertTransactionNormal } from './convert-transaction-normal';
import { convertTransactionERC20 } from './convert-transaction-erc20';

interface ExplorerPagination {
  queries: ('normal' | 'erc20')[];
  page?: number;
}

interface EtherscanApiResponse<T> {
  status: string;
  message: string;
  result: T[];
}

async function fetchFromExplorerApi<T>(baseUrl: string, params: Record<string, string>): Promise<T[]> {
  const searchParams = new URLSearchParams(params);
  const response = await fetch(`${baseUrl}/api?${searchParams.toString()}`);
  const data = (await response.json()) as EtherscanApiResponse<T>;

  return Array.isArray(data.result) ? data.result : [];
}

/**
 * Fetches transaction history from Etherscan-compatible explorer APIs
 * (e.g., Basescan, Arbiscan, Optimistic Etherscan).
 * These all use the same API format as Etherscan.
 */
export const getTransactionsFromExplorerApi = async ({
  explorerApiUrl,
  networkToken,
  explorerUrl,
  chainId,
  address,
  nextPageToken,
  offset,
}: {
  explorerApiUrl: string;
  networkToken: NetworkToken;
  explorerUrl: string;
  chainId: number;
  address: string;
  nextPageToken?: string;
  offset?: number;
}): Promise<TransactionHistoryResponse> => {
  const parsedPageToken = nextPageToken ? (JSON.parse(nextPageToken) as ExplorerPagination) : undefined;
  const page = parsedPageToken?.page || 1;
  const queries = parsedPageToken?.queries || ['normal', 'erc20'];

  const pageStr = page.toString();
  const offsetStr = offset?.toString() ?? '25';

  const normalHist = (
    queries.includes('normal')
      ? await fetchFromExplorerApi<NormalTx>(explorerApiUrl, {
          module: 'account',
          action: 'txlist',
          address,
          page: pageStr,
          offset: offsetStr,
          sort: 'desc',
        })
      : []
  ).map((tx) =>
    convertTransactionNormal({
      tx,
      chainId,
      networkToken,
      explorerUrl,
      address,
    }),
  );

  const erc20Hist = (
    queries.includes('erc20')
      ? await fetchFromExplorerApi<Erc20Tx>(explorerApiUrl, {
          module: 'account',
          action: 'tokentx',
          address,
          page: pageStr,
          offset: offsetStr,
          sort: 'desc',
        })
      : []
  ).map((tx) =>
    convertTransactionERC20({
      tx,
      address,
      explorerUrl,
      chainId,
    }),
  );

  const erc20TxHashes = erc20Hist.map((tx) => tx.hash);
  const filteredNormalTxs = normalHist.filter((tx) => !erc20TxHashes.includes(tx.hash));

  const next: ExplorerPagination = { queries: [], page: page + 1 };
  if (normalHist.length) next.queries.push('normal');
  if (erc20Hist.length) next.queries.push('erc20');

  return {
    transactions: [...filteredNormalTxs, ...erc20Hist],
    nextPageToken: next.queries.length ? JSON.stringify(next) : '',
  };
};
