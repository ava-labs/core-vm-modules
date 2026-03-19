import type { NetworkToken, TransactionHistoryResponse } from '@avalabs/vm-module-types';
import { convertMoralisTransaction } from './convert-moralis-transaction';
import type { MoralisWalletHistoryResponse } from './moralis-types';

const MORALIS_PROXY_BASE_URL = 'https://proxy-api.avax.network/proxy/moralis-evm';

type GetTransactionsFromMoralisParams = {
  chainId: number;
  networkToken: NetworkToken;
  explorerUrl: string;
  address: string;
  nextPageToken?: string;
  offset?: number;
};

export async function getTransactionsFromMoralis({
  chainId,
  networkToken,
  explorerUrl,
  address,
  nextPageToken,
  offset,
}: GetTransactionsFromMoralisParams): Promise<TransactionHistoryResponse> {
  try {
    const chainHex = `0x${chainId.toString(16)}`;
    const params = new URLSearchParams({
      chain: chainHex,
      limit: (offset ?? 25).toString(),
    });

    if (nextPageToken) {
      params.set('cursor', nextPageToken);
    }

    const url = `${MORALIS_PROXY_BASE_URL}/wallets/${address}/history?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      return { transactions: [], nextPageToken: '' };
    }

    const data = (await response.json()) as MoralisWalletHistoryResponse;

    if (!Array.isArray(data.result)) {
      return { transactions: [], nextPageToken: '' };
    }

    const transactions = data.result
      .filter((tx) => tx.receipt_status === '1')
      .map((tx) =>
        convertMoralisTransaction({
          tx,
          networkToken,
          explorerUrl,
          chainId,
          address,
        }),
      );

    return {
      transactions,
      nextPageToken: data.cursor ?? '',
    };
  } catch {
    return { transactions: [], nextPageToken: '' };
  }
}
