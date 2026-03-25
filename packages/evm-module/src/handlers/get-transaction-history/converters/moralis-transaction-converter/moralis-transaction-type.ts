import { TransactionType } from '@avalabs/vm-module-types';
import {
  shouldLabelBridgeTxTypeFromMethodCompact,
  shouldPromoteMoralisContractInteractionToBridgeCompact,
} from './moralis-method-flags';
import { normalizeMoralisMethodLabelCompact } from './moralis-method-normalize';
import { isMoralisErc20FromUserWithUserNativePayment } from './moralis-erc20-from-user-with-user-native-payment';
import type { MoralisCategory, MoralisTransaction } from './moralis-types';

const CATEGORY_TO_TX_TYPE: Record<MoralisCategory, TransactionType> = {
  send: TransactionType.SEND,
  receive: TransactionType.RECEIVE,
  'token send': TransactionType.SEND,
  'token receive': TransactionType.RECEIVE,
  'nft send': TransactionType.NFT_SEND,
  'nft receive': TransactionType.NFT_RECEIVE,
  'token swap': TransactionType.SWAP,
  'nft purchase': TransactionType.NFT_BUY,
  'nft sale': TransactionType.NFT_SEND,
  airdrop: TransactionType.AIRDROP,
  mint: TransactionType.NFT_BUY,
  burn: TransactionType.UNKNOWN,
  deposit: TransactionType.UNKNOWN,
  withdraw: TransactionType.UNKNOWN,
  borrow: TransactionType.UNKNOWN,
  'contract interaction': TransactionType.UNKNOWN,
};

export function getMoralisBaseTransactionType(category: MoralisCategory): TransactionType {
  return CATEGORY_TO_TX_TYPE[category] ?? TransactionType.UNKNOWN;
}

/** Moralis-only `txType` resolution (categories + bridge-shaped sends + contract interactions). */
export function classifyMoralisWalletTransactionType(tx: MoralisTransaction, walletAddress: string): TransactionType {
  const fromCategory = getMoralisBaseTransactionType(tx.category);
  const methodCompact = normalizeMoralisMethodLabelCompact(tx.method_label ?? undefined);
  const paymentShape = isMoralisErc20FromUserWithUserNativePayment(tx, walletAddress);

  if (tx.category === 'send' && paymentShape && shouldLabelBridgeTxTypeFromMethodCompact(methodCompact)) {
    return TransactionType.BRIDGE;
  }

  if (
    tx.category === 'contract interaction' &&
    paymentShape &&
    shouldPromoteMoralisContractInteractionToBridgeCompact(methodCompact)
  ) {
    return TransactionType.BRIDGE;
  }

  return fromCategory;
}
