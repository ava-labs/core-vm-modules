import { address as solAddress, type GetTransactionApi } from '@solana/web3.js';

import { isFulfilled } from '@internal/utils/src/utils/is-promise-fulfilled';

import { getProvider } from '@src/utils/get-provider';
import { hasPropertyDefined } from '@src/utils/has-property-defined';

type ParsedTx = ReturnType<GetTransactionApi['getTransaction']>;
type WrappedTransaction = { txHash: string; tx: NonNullable<ParsedTx> };

export const getWrappedTransactions = async ({
  isTestnet,
  address,
  proxyApiUrl,
}: {
  isTestnet: boolean;
  address: string;
  proxyApiUrl: string;
}): Promise<WrappedTransaction[]> => {
  const provider = getProvider({ isTestnet, proxyApiUrl });

  const signaturesResponse = await provider.getSignaturesForAddress(solAddress(address), { limit: 25 }).send(); // Same as we do for Bitcoin
  const signatures = signaturesResponse.map((sig) => sig.signature);
  const txsRequests = await Promise.allSettled(
    signatures.map(async (sig) => ({
      txHash: sig.toString(),
      tx: await provider.getTransaction(sig, { encoding: 'json' }).send(),
    })),
  );

  return txsRequests
    .filter(isFulfilled)
    .map((tx) => tx.value)
    .filter(hasPropertyDefined('tx'));
};
