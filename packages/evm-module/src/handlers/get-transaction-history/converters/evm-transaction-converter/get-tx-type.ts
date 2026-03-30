import type { TransactionDetails } from '@avalabs/glacier-sdk';
import { TokenType, TransactionType, type TxToken } from '@avalabs/vm-module-types';
import startCase from 'lodash.startcase';

function isNftTokenType(type: TokenType): boolean {
  return type === TokenType.ERC721 || type === TokenType.ERC1155;
}

/**
 * After a provisional {@link TransactionType} (e.g. Moralis category or Glacier heuristics below),
 * returns the same type or promotes generic send/receive/transfer/unknown to `NFT_SEND` / `NFT_RECEIVE`
 * when `tokens` shows the wallet sent or received an ERC-721/1155 (often not `tokens[0]` because rows
 * are ordered native → ERC-20 → NFTs). Exported for Moralis, which does not use {@link getTxType}.
 */
export function convertTransactionType(params: {
  txType: TransactionType;
  isSender: boolean;
  walletAddress: string;
  tokens: TxToken[];
}): TransactionType {
  const { txType, isSender, walletAddress, tokens } = params;
  if (tokens.length === 0) {
    return txType;
  }

  const normalizedWallet = walletAddress.toLowerCase();
  const userReceivedNft = tokens.some(
    (token) => isNftTokenType(token.type) && token.to?.address?.toLowerCase() === normalizedWallet,
  );
  const userSentNft = tokens.some(
    (token) => isNftTokenType(token.type) && token.from?.address?.toLowerCase() === normalizedWallet,
  );

  const receiveLike =
    txType === TransactionType.RECEIVE || txType === TransactionType.UNKNOWN || txType === TransactionType.TRANSFER;
  const sendLike =
    txType === TransactionType.SEND || txType === TransactionType.UNKNOWN || txType === TransactionType.TRANSFER;

  if (!isSender && userReceivedNft && receiveLike) {
    return TransactionType.NFT_RECEIVE;
  }
  if (isSender && userSentNft && sendLike) {
    return TransactionType.NFT_SEND;
  }
  return txType;
}

/**
 * Glacier history: classify from decoded method + transfer lists, then apply {@link convertTransactionType}
 * so NFT legs are not missed when fungible tokens appear first in `tokens`.
 */
export const getTxType = (
  { nativeTransaction, erc20Transfers, erc721Transfers, erc1155Transfers }: TransactionDetails,
  userAddress: string,
  tokens: TxToken[],
): TransactionType => {
  const nativeOnly = !erc20Transfers && !erc721Transfers && !erc1155Transfers;
  const method = parseRawMethod(nativeTransaction.method?.methodName);

  const address = userAddress.toLowerCase();

  const isSwap = method.toLowerCase().includes('swap');
  const isNativeSend = nativeOnly && nativeTransaction.from.address.toLowerCase() === address;
  const isNativeReceive = nativeOnly && nativeTransaction.to.address.toLowerCase() === address;
  const isNFTPurchase = method === 'Market Buy Orders With Eth' || method === 'Buy NFT';
  const isApprove = method === 'Approve';
  const isTransfer = method.toLowerCase().includes('transfer');
  const isAirdrop = method.toLowerCase().includes('airdrop');
  const isUnwrap = method.toLowerCase().includes('unwrap');
  const isFillOrder = method === 'Fill Order';

  let provisionalTxType: TransactionType;
  if (isSwap) {
    provisionalTxType = TransactionType.SWAP;
  } else if (isNativeSend) {
    provisionalTxType = TransactionType.SEND;
  } else if (isNativeReceive) {
    provisionalTxType = TransactionType.RECEIVE;
  } else if (isNFTPurchase) {
    provisionalTxType = TransactionType.NFT_BUY;
  } else if (isApprove) {
    provisionalTxType = TransactionType.APPROVE;
  } else if (isTransfer) {
    provisionalTxType = TransactionType.TRANSFER;
  } else if (isAirdrop) {
    provisionalTxType = TransactionType.AIRDROP;
  } else if (isUnwrap) {
    provisionalTxType = TransactionType.UNWRAP;
  } else if (isFillOrder) {
    provisionalTxType = TransactionType.FILL_ORDER;
  } else {
    provisionalTxType = TransactionType.UNKNOWN;
  }

  const isTxSigner = nativeTransaction.from.address.toLowerCase() === address;
  return convertTransactionType({
    txType: provisionalTxType,
    isSender: isTxSigner,
    walletAddress: userAddress,
    tokens,
  });
};

const parseRawMethod = (method = ''): string => {
  if (method.includes('(')) {
    return startCase(method.split('(', 1)[0]);
  }
  return method;
};
