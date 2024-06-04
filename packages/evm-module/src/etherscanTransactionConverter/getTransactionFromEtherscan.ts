import { convertTransactionNormal } from './convertTransactionNormal';
import { convertTransactionERC20 } from './convertTransactionERC20';
import { EtherscanPagination, GetTransactionHistory, TransactionHistoryResponse } from '../types';
import { getErc20Txs, getNormalTxs } from '@avalabs/etherscan-sdk';

export const getTransactionFromEtherscan = async ({
  network,
  address,
  nextPageToken,
  offset,
}: GetTransactionHistory): Promise<TransactionHistoryResponse> => {
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

  const normalHist = (
    queries.includes('normal') ? await getNormalTxs(address, !network.isTestnet, { page, offset }) : []
  ).map((tx) => convertTransactionNormal(tx, network, address));

  const erc20Hist = (
    queries.includes('normal')
      ? await getErc20Txs(address, !network.isTestnet, undefined, {
          page,
          offset,
        })
      : []
  ).map((tx) =>
    convertTransactionERC20({
      tx,
      address,
      network,
    }),
  );

  // Filter erc20 transactions from normal tx list
  const erc20TxHashes = erc20Hist.map((tx) => tx.hash);
  const filteredNormalTxs = normalHist.filter((tx) => {
    return !erc20TxHashes.includes(tx.hash);
  });

  const next: EtherscanPagination = { queries: [], page: page + 1 };
  if (normalHist.length) next.queries.push('normal');
  if (erc20Hist.length) next.queries.push('erc20');

  return {
    transactions: [...filteredNormalTxs, ...erc20Hist],
    nextPageToken: next.queries.length ? JSON.stringify(next) : '', // stop pagination
  };
};
