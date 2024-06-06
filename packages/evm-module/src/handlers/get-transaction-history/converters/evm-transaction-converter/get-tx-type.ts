import type { TransactionDetails } from '@avalabs/glacier-sdk';
import { TokenType, TransactionType, type TxToken } from '@internal/types';
import { startCase } from 'lodash';

export const getTxType = (
  { nativeTransaction, erc20Transfers, erc721Transfers }: TransactionDetails,
  address: string,
  tokens: TxToken[],
): TransactionType => {
  const nativeOnly = !erc20Transfers && !erc721Transfers;
  const method = parseRawMethod(nativeTransaction.method?.methodName);

  const isSwap = method.toLowerCase().includes('swap');
  const isNativeSend = nativeOnly && nativeTransaction.from.address === address;
  const isNativeReceive = nativeOnly && nativeTransaction.to.address === address;
  const isNFTPurchase = method === 'Market Buy Orders With Eth' || method === 'Buy NFT';
  const isApprove = method === 'Approve';
  const isTransfer = method.toLowerCase().includes('transfer');
  const isAirdrop = method.toLowerCase().includes('airdrop');
  const isUnwrap = method.toLowerCase().includes('unwrap');
  const isFillOrder = method === 'Fill Order';
  const isNFTSend = isTransfer && !!tokens[0] && isNFT(tokens[0].type) && tokens[0].from?.address === address;
  const isNFTReceive = isTransfer && !!tokens[0] && isNFT(tokens[0].type) && tokens[0].to?.address === address;

  if (isSwap) return TransactionType.SWAP;
  if (isNativeSend) return TransactionType.SEND;
  if (isNativeReceive) return TransactionType.RECEIVE;
  if (isNFTPurchase) return TransactionType.NFT_BUY;
  if (isApprove) return TransactionType.APPROVE;
  if (isTransfer) return TransactionType.TRANSFER;
  if (isAirdrop) return TransactionType.AIRDROP;
  if (isUnwrap) return TransactionType.UNWRAP;
  if (isFillOrder) return TransactionType.FILL_ORDER;
  if (isNFTSend) return TransactionType.NFT_SEND;
  if (isNFTReceive) return TransactionType.NFT_RECEIVE;
  return TransactionType.UNKNOWN;
};

function isNFT(tokenType: TokenType) {
  return tokenType === TokenType.ERC721 || tokenType === TokenType.ERC1155;
}

const parseRawMethod = (method = ''): string => {
  if (method.includes('(')) {
    return startCase(method.split('(', 1)[0]);
  }
  return method;
};
