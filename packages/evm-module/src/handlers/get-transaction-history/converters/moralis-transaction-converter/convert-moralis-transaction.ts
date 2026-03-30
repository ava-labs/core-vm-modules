import {
  TokenType,
  TransactionType,
  type NetworkToken,
  type Transaction,
  type TxToken,
} from '@avalabs/vm-module-types';
import { TokenUnit } from '@avalabs/core-utils-sdk';
import { getExplorerAddressByNetwork } from '../../utils/get-explorer-address-by-network';
import { convertTransactionType } from '../evm-transaction-converter/get-tx-type';
import type {
  MoralisCategory,
  MoralisTransaction,
  MoralisErc20Transfer,
  MoralisNativeTransfer,
  MoralisNftTransfer,
} from './moralis-types';

// Fusion / Markr cross-chain wrapper on Ethereum mainnet (Moralis often labels these as send / token send).
// https://etherscan.io/address/0x5c32d9dac5d16ef5e0ff634da73934e27f1669cc
const FUSION_CROSS_CHAIN_WRAPPER_ADDRESS = '0x5c32d9dac5d16ef5e0ff634da73934e27f1669cc';

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
  let txType = getMoralisTransactionType(tx.category);
  let isContractCall = !NON_CONTRACT_CALL_CATEGORIES.has(tx.category);
  const isFusionOutgoingCrossChain = chainId === 1 && isOutgoingFusionCrossChainWrapperTx(tx, address);

  if (isFusionOutgoingCrossChain) {
    txType = TransactionType.UNKNOWN;
    isContractCall = true;
  }

  const tokens = buildTokens(tx, networkToken, address, isFusionOutgoingCrossChain);
  const explorerLink = getExplorerAddressByNetwork(explorerUrl, tx.hash);

  txType = convertTransactionType({
    txType,
    isSender,
    walletAddress: address,
    tokens,
  });

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

function isOutgoingFusionCrossChainWrapperTx(tx: MoralisTransaction, walletAddress: string): boolean {
  const toAddress = tx.to_address?.trim().toLowerCase();
  if (toAddress !== FUSION_CROSS_CHAIN_WRAPPER_ADDRESS) {
    return false;
  }
  return tx.from_address.toLowerCase() === walletAddress.toLowerCase();
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

function buildTokens(
  tx: MoralisTransaction,
  networkToken: NetworkToken,
  address: string,
  erc20BeforeNativeForDisplay: boolean,
): TxToken[] {
  const tokens: TxToken[] = [];
  const nativeTokens = tx.native_transfers.map((transfer) => buildNativeToken(transfer, networkToken));
  const erc20Tokens = tx.erc20_transfers.map((transfer) => buildErc20Token(transfer));

  if (erc20BeforeNativeForDisplay && erc20Tokens.length > 0 && nativeTokens.length > 0) {
    tokens.push(...erc20Tokens, ...nativeTokens);
  } else {
    tokens.push(...nativeTokens, ...erc20Tokens);
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
