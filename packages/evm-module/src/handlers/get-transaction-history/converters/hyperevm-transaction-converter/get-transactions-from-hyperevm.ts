import { TokenUnit } from '@avalabs/core-utils-sdk';
import {
  TokenType,
  TransactionType,
  type NetworkToken,
  type Transaction,
  type TransactionHistoryResponse,
  type TxToken,
} from '@avalabs/vm-module-types';
import type {
  HyperEvmErc20Transfer,
  HyperEvmEtherscanClient,
  HyperEvmInternalTransaction,
  HyperEvmNormalTransaction,
} from '../../../../services/hyperevm-etherscan-client/hyperevm-etherscan-client';
import { getExplorerAddressByNetwork } from '../../utils/get-explorer-address-by-network';

type Aggregate = {
  hash: string;
  timestamp: number;
  from: string;
  to: string;
  gasPrice?: string;
  gasUsed: string;
  isContractCall: boolean;
  tokens: TxToken[];
};

export async function getTransactionsFromHyperEvm({
  client,
  chainId,
  networkToken,
  explorerUrl,
  address,
  nextPageToken,
  offset = 25,
}: {
  client: Pick<HyperEvmEtherscanClient, 'listNormalTransactions' | 'listErc20Transfers' | 'listInternalTransactions'>;
  chainId: number;
  networkToken: NetworkToken;
  explorerUrl: string;
  address: string;
  nextPageToken?: string;
  offset?: number;
}): Promise<TransactionHistoryResponse> {
  try {
    const page = getPage(nextPageToken);
    const [normal, erc20, internal] = await Promise.all([
      client.listNormalTransactions(address, { page, offset }),
      client.listErc20Transfers(address, { page, offset }),
      client.listInternalTransactions(address, { page, offset }),
    ]);
    const aggregates = new Map<string, Aggregate>();

    for (const transaction of normal) {
      if (transaction.isError !== '0' || transaction.txreceipt_status !== '1') continue;
      const aggregate = getAggregate(aggregates, transaction);
      const token = nativeToken(transaction, networkToken);
      if (token) aggregate.tokens.push(token);
    }
    for (const transfer of erc20) {
      const aggregate = getAggregate(aggregates, transfer);
      aggregate.tokens.push(erc20Token(transfer));
    }
    for (const transaction of internal) {
      if (transaction.isError !== '0') continue;
      const aggregate = getAggregate(aggregates, transaction);
      const token = internalToken(transaction, networkToken);
      if (token) aggregate.tokens.push(token);
    }

    const transactions = Array.from(aggregates.values())
      .map((aggregate) => toTransaction(aggregate, address, explorerUrl, networkToken, chainId))
      .sort((a, b) => b.timestamp - a.timestamp);
    const hasNextPage = [normal, erc20, internal].some((list) => list.length === offset);

    return { transactions, nextPageToken: hasNextPage ? String(page + 1) : '' };
  } catch {
    return { transactions: [], nextPageToken: '' };
  }
}

function getPage(nextPageToken?: string): number {
  const page = Number(nextPageToken);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function getAggregate(
  aggregates: Map<string, Aggregate>,
  transaction: HyperEvmNormalTransaction | HyperEvmErc20Transfer | HyperEvmInternalTransaction,
): Aggregate {
  const existing = aggregates.get(transaction.hash);
  if (existing) return existing;

  const aggregate: Aggregate = {
    hash: transaction.hash,
    timestamp: Number(transaction.timeStamp) * 1000,
    from: transaction.from,
    to: transaction.to,
    gasPrice: 'gasPrice' in transaction ? transaction.gasPrice : undefined,
    gasUsed: transaction.gasUsed,
    isContractCall: 'input' in transaction && transaction.input !== '0x',
    tokens: [],
  };
  aggregates.set(transaction.hash, aggregate);
  return aggregate;
}

function nativeToken(transaction: HyperEvmNormalTransaction, networkToken: NetworkToken): TxToken | undefined {
  if (transaction.value === '0') return undefined;
  return {
    decimal: String(networkToken.decimals),
    name: networkToken.name,
    symbol: networkToken.symbol,
    amount: new TokenUnit(transaction.value, networkToken.decimals, networkToken.symbol).toDisplay(),
    from: { address: transaction.from },
    to: { address: transaction.to },
    type: TokenType.NATIVE,
  };
}

function internalToken(transaction: HyperEvmInternalTransaction, networkToken: NetworkToken): TxToken | undefined {
  if (transaction.value === '0') return undefined;
  return {
    decimal: String(networkToken.decimals),
    name: networkToken.name,
    symbol: networkToken.symbol,
    amount: new TokenUnit(transaction.value, networkToken.decimals, networkToken.symbol).toDisplay(),
    from: { address: transaction.from },
    to: { address: transaction.to },
    type: TokenType.NATIVE,
  };
}

function erc20Token(transfer: HyperEvmErc20Transfer): TxToken {
  return {
    decimal: transfer.tokenDecimal,
    name: transfer.tokenName,
    symbol: transfer.tokenSymbol,
    amount: new TokenUnit(transfer.value, Number(transfer.tokenDecimal), transfer.tokenSymbol).toDisplay(),
    from: { address: transfer.from },
    to: { address: transfer.to },
    type: TokenType.ERC20,
    address: transfer.contractAddress,
  };
}

function toTransaction(
  aggregate: Aggregate,
  address: string,
  explorerUrl: string,
  networkToken: NetworkToken,
  chainId: number,
): Transaction {
  const wallet = address.toLowerCase();
  const hasIncoming = aggregate.tokens.some((token) => token.to?.address.toLowerCase() === wallet);
  const hasOutgoing = aggregate.tokens.some((token) => token.from?.address.toLowerCase() === wallet);
  const isSender = aggregate.from.toLowerCase() === wallet || hasOutgoing;
  const txType =
    hasIncoming && hasOutgoing ? TransactionType.SWAP : isSender ? TransactionType.SEND : TransactionType.RECEIVE;

  return {
    isContractCall: aggregate.isContractCall || (hasIncoming && hasOutgoing),
    isIncoming: hasIncoming && !hasOutgoing,
    isOutgoing: hasOutgoing,
    isSender,
    timestamp: aggregate.timestamp,
    hash: aggregate.hash,
    from: aggregate.from,
    to: aggregate.to,
    tokens:
      aggregate.tokens.length > 0
        ? aggregate.tokens
        : [
            {
              decimal: String(networkToken.decimals),
              name: networkToken.name,
              symbol: networkToken.symbol,
              amount: '0',
              type: TokenType.NATIVE,
            },
          ],
    gasPrice: aggregate.gasPrice,
    gasUsed: aggregate.gasUsed,
    chainId: chainId.toString(),
    txType,
    explorerLink: getExplorerAddressByNetwork(explorerUrl, aggregate.hash),
  };
}
