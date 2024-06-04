import { TransactionDetails } from '@avalabs/glacier-sdk';
import { NonContractCallTypes, TransactionType, TxHistoryCategories } from '../types';
import { startCase } from 'lodash';

export const getTxHistoryCategories = (
  { nativeTransaction, erc20Transfers, erc721Transfers }: TransactionDetails,
  address: string,
): TxHistoryCategories => {
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
  const txType = isSwap
    ? TransactionType.SWAP
    : isNativeSend
    ? TransactionType.SEND
    : isNativeReceive
    ? TransactionType.RECEIVE
    : isNFTPurchase
    ? TransactionType.NFT_BUY
    : isApprove
    ? TransactionType.APPROVE
    : isTransfer
    ? TransactionType.TRANSFER
    : TransactionType.UNKNOWN;
  const isContractCall = !NonContractCallTypes.includes(type);

  return {
    isSwap,
    isNativeSend,
    isNativeReceive,
    isNFTPurchase,
    isApprove,
    isTransfer,
    isAirdrop,
    isUnwrap,
    isFillOrder,
    isContractCall,
    method,
    txType,
  };
};

const parseRawMethod = (method = ''): string => {
  if (method.includes('(')) {
    return startCase(method.split('(', 1)[0]);
  }
  return method;
};
