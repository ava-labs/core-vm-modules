import type { NetworkToken, TransactionHistoryResponse } from '@avalabs/vm-module-types';
import { Glacier } from '@avalabs/glacier-sdk';
import { rpcErrors } from '@metamask/rpc-errors';
import { convertTransaction } from './convert-transaction';

export const getTransactionsFromGlacier = async ({
  chainId,
  explorerUrl,
  networkToken,
  address,
  nextPageToken,
  offset,
  glacierApiUrl,
}: {
  chainId: number;
  explorerUrl: string;
  networkToken: NetworkToken;
  address: string;
  nextPageToken?: string;
  offset?: number;
  glacierApiUrl: string;
}): Promise<TransactionHistoryResponse> => {
  if (!glacierApiUrl) {
    throw rpcErrors.invalidParams('Glacier API URL is required');
  }

  const glacierSdk = new Glacier({ BASE: glacierApiUrl });

  try {
    const response = await glacierSdk.evmTransactions.listTransactions({
      chainId: chainId.toString(),
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
            explorerUrl,
            networkToken,
            chainId,
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
