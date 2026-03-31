import type { TransactionDetails } from '@avalabs/glacier-sdk';
import { TransactionType } from '@avalabs/vm-module-types';

export const getSenderInfo = (
  txType: TransactionType,
  { nativeTransaction, erc20Transfers, erc721Transfers }: TransactionDetails,
  address: string,
): { isOutgoing: boolean; isIncoming: boolean; isSender: boolean; from: string; to: string } => {
  const isTransfer = txType === TransactionType.TRANSFER;
  // Glacier: SEND/RECEIVE are already “direction known from tx type” (historically native-only).
  // NFT_SEND/NFT_RECEIVE are the same idea for one-sided NFT transfers — not “native”.
  const isOutgoingByTxType = txType === TransactionType.SEND || txType === TransactionType.NFT_SEND;
  const isIncomingByTxType = txType === TransactionType.RECEIVE || txType === TransactionType.NFT_RECEIVE;
  let from = nativeTransaction?.from?.address;
  let to = nativeTransaction?.to?.address;

  // Until multi tokens transaction is supported in UI, using from and to of the only token is helpful for UI
  if (isTransfer && erc20Transfers && erc20Transfers[0]) {
    from = erc20Transfers[0].from.address;
    to = erc20Transfers[0].to.address;
  }

  if (isTransfer && erc721Transfers && erc721Transfers[0]) {
    from = erc721Transfers[0].from.address;
    to = erc721Transfers[0].to.address;
  }

  const isOutgoing = isOutgoingByTxType || (isTransfer && from.toLowerCase() === address.toLowerCase());
  const isIncoming = isIncomingByTxType || (isTransfer && to.toLowerCase() === address.toLowerCase());

  const isSender = from === address;

  return {
    isOutgoing,
    isIncoming,
    isSender,
    from,
    to,
  };
};
