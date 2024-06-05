import type { GetTransactionHistory, TransactionHistoryResponse } from '@internal/types';
import { Glacier } from '@avalabs/glacier-sdk';
import { convertTransaction } from './convertTransaction';

export const getTransactionsFromGlacier = async ({
  network,
  address,
  nextPageToken,
  offset,
  glacierApiUrl,
}: GetTransactionHistory): Promise<TransactionHistoryResponse> => {
  const glacierSdk = new Glacier({ BASE: glacierApiUrl });

  try {
    const response = await glacierSdk.evmTransactions.listTransactions({
      chainId: network.chainId.toString(),
      address,
      pageToken: nextPageToken,
      pageSize: offset,
    });

    const convertedTxs = await Promise.all(
      response.transactions
        .filter(
          // Currently not showing failed tx
          (tranasaction) => tranasaction.nativeTransaction.txStatus === '1',
        )
        .map((transactions) =>
          convertTransaction({
            transactions,
            network,
            address,
          }).then((tx) => tx),
        ),
    );

    const transactions = convertedTxs.filter(
      // Filtering txs with 0 value since there is no change in balance
      (transaction) => transaction.tokens.find((token) => Number(token.amount) !== 0),
    );

    return {
      transactions,
      nextPageToken: response.nextPageToken,
    };
  } catch {
    return {
      transactions: [],
      nextPageToken: '',
    };
  }
};
