import {
  TokenType,
  TransactionType,
  type NetworkToken,
  type Transaction,
  type TxToken,
} from '@avalabs/vm-module-types';
import { TokenUnit } from '@avalabs/core-utils-sdk';
import { getExplorerAddressByNetwork } from '../../utils/get-explorer-address-by-network';
import type {
  MoralisCategory,
  MoralisTransaction,
  MoralisErc20Transfer,
  MoralisNativeTransfer,
  MoralisNftTransfer,
} from './moralis-types';

type ConvertMoralisTransactionParams = {
  tx: MoralisTransaction;
  networkToken: NetworkToken;
  explorerUrl: string;
  chainId: number;
  address: string;
};

export function convertMoralisTransaction({
  tx,
  networkToken,
  explorerUrl,
  chainId,
  address,
}: ConvertMoralisTransactionParams): Transaction {
  const isSender = tx.from_address.toLowerCase() === address.toLowerCase();
  const timestamp = new Date(tx.block_timestamp).getTime();
  const txType = resolveMoralisTransactionType(tx, address);
  const isContractCall = !NON_CONTRACT_CALL_CATEGORIES.has(tx.category);
  const tokens = buildTokens(tx, networkToken, address);
  const explorerLink = getExplorerAddressByNetwork(explorerUrl, tx.hash);

  return {
    isContractCall,
    isIncoming: !isSender,
    isOutgoing: isSender,
    isSender,
    timestamp,
    hash: tx.hash,
    from: tx.from_address,
    to: tx.to_address ?? '',
    tokens,
    gasPrice: tx.gas_price,
    gasUsed: tx.receipt_gas_used,
    chainId: chainId.toString(),
    txType,
    method: tx.method_label ?? undefined,
    explorerLink,
  };
}

const NON_CONTRACT_CALL_CATEGORIES = new Set<MoralisCategory>(['send', 'receive', 'token send', 'token receive']);

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

function getMoralisTransactionType(category: MoralisCategory): TransactionType {
  return CATEGORY_TO_TX_TYPE[category] ?? TransactionType.UNKNOWN;
}

/**
 * When Moralis uses raw category `send` (not `token send`) and the tx matches
 * `isErc20FromUserWithUserNativePayment` on the Glacier path — classify as Bridge. Keeps `token send` as
 * SEND (both map to TransactionType.SEND downstream).
 */
function resolveMoralisTransactionType(tx: MoralisTransaction, walletAddress: string): TransactionType {
  const fromCategory = getMoralisTransactionType(tx.category);

  if (tx.category === 'send' && isMoralisErc20FromUserWithUserNativePayment(tx, walletAddress)) {
    return TransactionType.BRIDGE;
  }

  return fromCategory;
}

function getTransferAddress(address: string | null | undefined): { address: string } | undefined {
  if (address == null || address === '') {
    return undefined;
  }
  return { address };
}

function trimOrEmpty(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function positiveTxValueBigInt(value: string | null | undefined): bigint {
  try {
    const n = BigInt(trimOrEmpty(value) || '0');
    return n > 0n ? n : 0n;
  } catch {
    return 0n;
  }
}

/** Same predicate as `isErc20FromUserWithUserNativePayment` (Glacier); Moralis field shapes differ. */
function isMoralisErc20FromUserWithUserNativePayment(tx: MoralisTransaction, walletAddress: string): boolean {
  const addr = walletAddress.toLowerCase();
  const userSentErc20 = tx.erc20_transfers.some((t) => trimOrEmpty(t.from_address).toLowerCase() === addr);
  if (!userSentErc20) {
    return false;
  }
  const userNativeOut =
    tx.native_transfers.some((n) => trimOrEmpty(n.from_address).toLowerCase() === addr) ||
    (positiveTxValueBigInt(tx.value) > 0n && trimOrEmpty(tx.from_address).toLowerCase() === addr);
  return userNativeOut;
}

function shortenHexAddress(address: string): string {
  const normalized = address.trim().toLowerCase();
  if (!normalized.startsWith('0x') || normalized.length < 12) {
    return address.trim();
  }
  return `${normalized.slice(0, 6)}…${normalized.slice(-4)}`;
}

function getErc20DisplaySymbol(transfer: MoralisErc20Transfer): string {
  const fromSymbol = trimOrEmpty(transfer.token_symbol);
  if (fromSymbol !== '') {
    return fromSymbol;
  }
  const fromName = trimOrEmpty(transfer.token_name);
  if (fromName !== '') {
    return fromName;
  }
  return shortenHexAddress(transfer.address);
}

function buildTokens(tx: MoralisTransaction, networkToken: NetworkToken, address: string): TxToken[] {
  const tokens: TxToken[] = [];
  const addr = address.toLowerCase();
  const omitUserNativeLegForPerTokenActivity = isMoralisErc20FromUserWithUserNativePayment(tx, address);

  for (const transfer of tx.native_transfers) {
    const nativeFromUser = trimOrEmpty(transfer.from_address).toLowerCase() === addr;
    if (omitUserNativeLegForPerTokenActivity && nativeFromUser) {
      continue;
    }
    tokens.push(buildNativeToken(transfer, networkToken));
  }

  for (const transfer of tx.erc20_transfers) {
    tokens.push(buildErc20Token(transfer));
  }

  for (const transfer of tx.nft_transfers) {
    tokens.push(buildNftToken(transfer));
  }

  if (tokens.length === 0) {
    tokens.push(buildFallbackNativeToken(tx, networkToken, address));
  }

  return tokens;
}

function buildNativeToken(transfer: MoralisNativeTransfer, networkToken: NetworkToken): TxToken {
  const displaySymbol = trimOrEmpty(transfer.token_symbol) || networkToken.symbol;
  const amount = new TokenUnit(transfer.value, networkToken.decimals, displaySymbol);

  return {
    decimal: networkToken.decimals.toString(),
    name: networkToken.name,
    symbol: displaySymbol,
    amount: amount.toDisplay(),
    from: getTransferAddress(transfer.from_address),
    to: getTransferAddress(transfer.to_address),
    type: TokenType.NATIVE,
  };
}

function buildErc20Token(transfer: MoralisErc20Transfer): TxToken {
  const decimals = Number(transfer.token_decimals);
  const displaySymbol = getErc20DisplaySymbol(transfer);
  const amount = new TokenUnit(transfer.value, decimals, displaySymbol);
  const displayName = trimOrEmpty(transfer.token_name) || displaySymbol;

  return {
    decimal: transfer.token_decimals,
    name: displayName,
    symbol: displaySymbol,
    amount: amount.toDisplay(),
    from: getTransferAddress(transfer.from_address),
    to: getTransferAddress(transfer.to_address),
    type: TokenType.ERC20,
    address: transfer.address,
  };
}

function buildNftToken(transfer: MoralisNftTransfer): TxToken {
  const tokenType = transfer.contract_type === 'ERC1155' ? TokenType.ERC1155 : TokenType.ERC721;

  return {
    name: '',
    symbol: '',
    amount: transfer.amount,
    collectableTokenId: transfer.token_id,
    from: getTransferAddress(transfer.from_address),
    to: getTransferAddress(transfer.to_address),
    type: tokenType,
    address: transfer.token_address,
  };
}

function buildFallbackNativeToken(tx: MoralisTransaction, networkToken: NetworkToken, address: string): TxToken {
  const amount = new TokenUnit(tx.value, networkToken.decimals, networkToken.symbol);
  const isSender = tx.from_address.toLowerCase() === address.toLowerCase();
  const displayAmount = isSender ? `-${amount.toDisplay()}` : amount.toDisplay();

  return {
    decimal: networkToken.decimals.toString(),
    name: networkToken.name,
    symbol: networkToken.symbol,
    amount: displayAmount,
    from: getTransferAddress(tx.from_address),
    to: getTransferAddress(tx.to_address),
    type: TokenType.NATIVE,
  };
}
