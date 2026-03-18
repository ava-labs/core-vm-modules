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
  const txType = getMoralisTransactionType(tx.category);
  const isContractCall = !NON_CONTRACT_CALL_CATEGORIES.has(tx.category.toLowerCase());
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

const NON_CONTRACT_CALL_CATEGORIES = new Set(['send', 'receive', 'token send', 'token receive']);

function getMoralisTransactionType(category: string): TransactionType {
  const cat = category.toLowerCase();

  if (cat.includes('send')) return TransactionType.SEND;
  if (cat.includes('receive')) return TransactionType.RECEIVE;
  if (cat.includes('swap')) return TransactionType.SWAP;
  if (cat.includes('bridge')) return TransactionType.BRIDGE;
  if (cat.includes('approve')) return TransactionType.APPROVE;
  if (cat.includes('airdrop')) return TransactionType.AIRDROP;
  if (cat.includes('mint') || cat.includes('nft purchase')) return TransactionType.NFT_BUY;
  if (cat.includes('unwrap')) return TransactionType.UNWRAP;
  if (cat.includes('fill_order')) return TransactionType.FILL_ORDER;
  if (cat.includes('transfer')) return TransactionType.TRANSFER;

  return TransactionType.UNKNOWN;
}

function buildTokens(tx: MoralisTransaction, networkToken: NetworkToken, address: string): TxToken[] {
  const tokens: TxToken[] = [];

  for (const transfer of tx.native_transfers) {
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
  const amount = new TokenUnit(transfer.value, networkToken.decimals, networkToken.symbol);

  return {
    decimal: networkToken.decimals.toString(),
    name: networkToken.name,
    symbol: transfer.token_symbol || networkToken.symbol,
    amount: amount.toDisplay(),
    type: TokenType.NATIVE,
  };
}

function buildErc20Token(transfer: MoralisErc20Transfer): TxToken {
  const decimals = Number(transfer.token_decimals);
  const amount = new TokenUnit(transfer.value, decimals, transfer.token_symbol);

  return {
    decimal: transfer.token_decimals,
    name: transfer.token_name,
    symbol: transfer.token_symbol,
    amount: amount.toDisplay(),
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
    type: TokenType.NATIVE,
  };
}
