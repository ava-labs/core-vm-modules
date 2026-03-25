import type { TransactionDetails } from '@avalabs/glacier-sdk';
import { TokenType, TransactionType, type TxToken } from '@avalabs/vm-module-types';
import startCase from 'lodash.startcase';
import { isErc20FromUserWithUserNativePayment } from './is-erc20-from-user-with-user-native-payment';

/**
 * Glacier / non-Moralis EVM history: lightweight method-string checks only.
 * Moralis-specific classification lives under `moralis-transaction-converter/`.
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
  const isNFTSend = !!tokens[0] && isNFT(tokens[0].type) && tokens[0].from?.address.toLowerCase() === address;
  const isNFTReceive = !!tokens[0] && isNFT(tokens[0].type) && tokens[0].to?.address.toLowerCase() === address;

  if (isSwap) {
    return TransactionType.SWAP;
  }
  if (isNativeSend) {
    return TransactionType.SEND;
  }
  if (isNativeReceive) {
    return TransactionType.RECEIVE;
  }
  if (!nativeOnly && isErc20FromUserWithUserNativePayment(nativeTransaction, erc20Transfers, userAddress)) {
    return TransactionType.BRIDGE;
  }
  if (isNFTPurchase) {
    return TransactionType.NFT_BUY;
  }
  if (isApprove) {
    return TransactionType.APPROVE;
  }
  if (isNFTSend) {
    return TransactionType.NFT_SEND;
  }
  if (isNFTReceive) {
    return TransactionType.NFT_RECEIVE;
  }
  if (isTransfer) {
    return TransactionType.TRANSFER;
  }
  if (isAirdrop) {
    return TransactionType.AIRDROP;
  }
  if (isUnwrap) {
    return TransactionType.UNWRAP;
  }
  if (isFillOrder) {
    return TransactionType.FILL_ORDER;
  }
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
