import type { TransactionDetails } from '@avalabs/glacier-sdk';
import { TransactionType } from '@avalabs/vm-module-types';

export const getSenderInfo = (
  txType: TransactionType,
  { nativeTransaction, erc20Transfers, erc721Transfers }: TransactionDetails,
  address: string,
): { isOutgoing: boolean; isIncoming: boolean; isSender: boolean; from: string; to: string } => {
  const isTransfer = txType === TransactionType.TRANSFER;
  const isNativeSend = txType === TransactionType.SEND;
  const isNativeReceive = txType === TransactionType.RECEIVE;
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

  const isOutgoing = isNativeSend || (isTransfer && from.toLowerCase() === address.toLowerCase());
  const isIncoming = isNativeReceive || (isTransfer && to.toLowerCase() === address.toLowerCase());

  const isSender = from === address;

  return {
    isOutgoing,
    isIncoming,
    isSender,
    from,
    to,
  };
};
