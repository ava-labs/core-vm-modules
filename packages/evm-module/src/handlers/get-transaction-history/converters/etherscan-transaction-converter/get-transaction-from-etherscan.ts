import { convertTransactionNormal } from './convert-transaction-normal';
import { convertTransactionERC20 } from './convert-transaction-erc20';
import type { NetworkToken, Transaction, TransactionHistoryResponse } from '@avalabs/vm-module-types';
import { TransactionType } from '@avalabs/vm-module-types';
import { getErc20Txs, getNormalTxs } from '@avalabs/core-etherscan-sdk';

interface EtherscanPagination {
  queries: ('normal' | 'erc20')[];
  page?: number;
}

export const getTransactionFromEtherscan = async ({
  isTestnet,
  networkToken,
  explorerUrl,
  chainId,
  address,
  nextPageToken,
  offset,
}: {
  isTestnet?: boolean;
  networkToken: NetworkToken;
  explorerUrl: string;
  chainId: number;
  address: string;
  nextPageToken?: string;
  offset?: number;
}): Promise<TransactionHistoryResponse> => {
  /*
  Using JSON for nextPageToken because this function is managing both the Normal
  and ERC20 queries. It encodes the current page and the queries that should be
  run. For example, if 'normal' has no more records to fetch then it will be
  excluded from the list and the JSON will be something like:
  { page: 3, queries: ['erc20'] }
  */
  const parsedPageToken = nextPageToken ? (JSON.parse(nextPageToken) as EtherscanPagination) : undefined;
  const page = parsedPageToken?.page || 1;
  const queries = parsedPageToken?.queries || ['normal', 'erc20'];

  const normalHist = (queries.includes('normal') ? await getNormalTxs(address, !isTestnet, { page, offset }) : []).map(
    (tx) => convertTransactionNormal({ tx, chainId, networkToken, explorerUrl, address }),
  );

  const erc20Hist = (
    queries.includes('erc20')
      ? await getErc20Txs(address, !isTestnet, undefined, {
          page,
          offset,
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

  const transactions = mergeSwapTransactions(normalHist, erc20Hist);

  const next: EtherscanPagination = { queries: [], page: page + 1 };
  if (normalHist.length) next.queries.push('normal');
  if (erc20Hist.length) next.queries.push('erc20');

  return {
    transactions,
    nextPageToken: next.queries.length ? JSON.stringify(next) : '',
  };
};

/**
 * When a normal tx (contract call) and ERC20 tx(s) share the same hash,
 * they represent a single on-chain operation (typically a swap). Merge them
 * into one Transaction with all tokens and txType SWAP.
 */
export function mergeSwapTransactions(normalHist: Transaction[], erc20Hist: Transaction[]): Transaction[] {
  const erc20ByHash = new Map<string, Transaction[]>();
  for (const tx of erc20Hist) {
    const existing = erc20ByHash.get(tx.hash);
    if (existing) {
      existing.push(tx);
    } else {
      erc20ByHash.set(tx.hash, [tx]);
    }
  }

  const mergedHashes = new Set<string>();
  const result: Transaction[] = [];

  for (const normalTx of normalHist) {
    const matchingErc20Txs = erc20ByHash.get(normalTx.hash);

    if (matchingErc20Txs && normalTx.isContractCall) {
      const erc20Tokens = matchingErc20Txs.flatMap((tx) => tx.tokens);
      const hasNativeValue = normalTx.tokens.some((t) => Number(t.amount) !== 0);

      result.push({
        ...normalTx,
        txType: TransactionType.SWAP,
        tokens: [...(hasNativeValue ? normalTx.tokens : []), ...erc20Tokens],
      });
      mergedHashes.add(normalTx.hash);
    } else {
      result.push(normalTx);
    }
  }

  for (const erc20Tx of erc20Hist) {
    if (!mergedHashes.has(erc20Tx.hash)) {
      result.push(erc20Tx);
    }
  }

  return result;
}
