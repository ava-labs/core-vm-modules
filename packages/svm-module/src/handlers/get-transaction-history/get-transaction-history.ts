import { TransactionType, type Network, type TransactionHistoryResponse, type TxToken } from '@avalabs/vm-module-types';
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

  
  const rawTransactions = await getWrappedTransactions({ network, address, proxyApiUrl });
  
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
      let accountIndex = addresses.indexOf(address);
      let isOurAddressInTransaction = accountIndex !== -1;

      // If not in accountKeys, check if we're an owner in token balances (for ATA transactions)
      if (!isOurAddressInTransaction && meta.preTokenBalances) {
        const isOwnerInTokenBalances = meta.preTokenBalances.some(balance => balance.owner === address) ||
                                       (meta.postTokenBalances ?? []).some(balance => balance.owner === address);
        if (isOwnerInTokenBalances) {
          isOurAddressInTransaction = true;
          // Set accountIndex to -1 to indicate we're not directly in accountKeys but are involved via token balances
          accountIndex = -1;
        }
      }

      // accountKeys property is sorted in Solana transactions. The signing keys
      // are always the first, and the header.numRequiredSignatures tells us how many
      // of the first keys are signers. If the lookup address is a signer, it has to be
      // one of the first N keys. For ATA transactions (accountIndex = -1), we're not a direct signer.
      const isSigner = accountIndex !== -1 && accountIndex < message.header.numRequiredSignatures;

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


      const txType = inferTxType(transfers, address);

      return {
        hash: txHash,
        // We should probably be smarter about the tx type, but this should be enough for MVP
        txType,
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

const inferTxType = (transfers: TxToken[], address: string) => {
  // No transfers = unknown
  if (transfers.length === 0) {
    return TransactionType.UNKNOWN;
  }

  // Check if we're the sender or receiver for each token transfer
  const ourTransfers = transfers.filter(t => 
    t.from?.address === address || t.to?.address === address
  );

  // If we have no transfers involving our address, it's unknown
  if (ourTransfers.length === 0) {
    return TransactionType.UNKNOWN;
  }

  // If we're only sending
  const onlySending = ourTransfers.every(t => t.from?.address === address);
  if (onlySending) {
    return TransactionType.SEND;
  }

  // If we're only receiving
  const onlyReceiving = ourTransfers.every(t => t.to?.address === address);
  if (onlyReceiving) {
    return TransactionType.RECEIVE;
  }

  // If we're both sending and receiving, it's a swap
  return TransactionType.SWAP;
};
