import { TransactionType, type Network, type TransactionHistoryResponse } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';

import { extractTokenTranfers, simplifyTokenBalance } from './extract-transfer';
import { getWrappedTransactions } from './get-wrapped-transactions';
import { getExplorerLink } from './get-explorer-link';

type SvmGetTransactionHistory = {
  network: Network;
  address: string;
  proxyApiUrl: string;
};

export async function getTransactionHistory({
  network,
  address,
  proxyApiUrl,
}: SvmGetTransactionHistory): Promise<TransactionHistoryResponse> {
  if (!network.caipId) {
    return Promise.reject({
      error: rpcErrors.invalidParams(`Network must have a CAIP-2 id`),
    });
  }

  const rawTransactions = await getWrappedTransactions({ isTestnet: Boolean(network.isTestnet), address, proxyApiUrl });
  const transactions = rawTransactions
    .map(({ txHash, tx }) => {
      if (!tx.meta) {
        return null;
      }

      const {
        meta,
        transaction: { message },
      } = tx;
      // Typings are wrong here, .toString() fixes it without unnecessary casting
      const addresses = message.accountKeys.map((acc) => acc.toString());
      const accountIndex = addresses.indexOf(address);

      // accountKeys property is sorted in Solana transactions. The signing keys
      // are always the first, and the header.numRequiredSignatures tells us how many
      // of the first keys are signers. If the lookup address is a signer, it has to be
      // one of the first N keys.
      const isSigner = accountIndex < message.header.numRequiredSignatures;

      const transfers = extractTokenTranfers(
        addresses,
        accountIndex,
        {
          paidFee: isSigner ? Number(meta.fee) : 0,
          preBalances: meta.preBalances.map(Number),
          postBalances: meta.postBalances.map(Number),
          preTokenBalances: (meta.preTokenBalances ?? []).map(simplifyTokenBalance),
          postTokenBalances: (meta.postTokenBalances ?? []).map(simplifyTokenBalance),
        },
        network,
      );

      return {
        hash: txHash,
        // We should probably be smarter about the tx type, but this should be enough for MVP
        txType: isSigner ? TransactionType.SEND : TransactionType.RECEIVE,
        gasUsed: String(tx.meta.computeUnitsConsumed ?? '0'),
        tokens: transfers,

        // Get to/from addresses from the token transfers if possible.
        // If not possible:
        //   - default "from" to the signing address
        //   - default "to" to our address if we're not the signer and leave empty if we don't know.
        from: transfers[0]?.from?.address ?? (addresses[0] as string),
        to: transfers[0]?.to?.address ?? (isSigner ? '' : address),
        isOutgoing: isSigner,
        isIncoming: !isSigner,
        isSender: isSigner,
        timestamp: Number(tx.blockTime) * 1000,
        isContractCall: false,
        gasPrice: String(Number(tx.meta.fee) / Number(tx.meta.computeUnitsConsumed)),
        chainId: String(network.chainId),
        explorerLink: getExplorerLink(txHash, network.explorerUrl),
      };
    })
    .filter(<T>(tx: T): tx is NonNullable<T> => tx !== null);

  return {
    transactions,
  };
}
