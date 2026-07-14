import { TokenType, TransactionType, type Network, type Transaction, type TxToken } from '@avalabs/vm-module-types';
import { HYPERCORE_CAIP_ID } from '../../constants';
import { hyperliquidCoinSvgUrl } from '../hyperliquid-coin-svg-url';
import type { HypercoreLedgerUpdate, UserFill } from '../schemas';
import { getHypercoreLedgerDisplay } from './get-hypercore-ledger-display';
import { encodeHypercoreFillMethod, tickerOfCoin } from './hypercore-fill-meta';
import type { HypercoreActivityItem } from './types';
import { toTimeMs } from './types';

const explorerTxLink = (network: Pick<Network, 'explorerUrl'>, hash: string) => {
  const base = (network.explorerUrl ?? '').replace(/\/$/, '');
  return base ? `${base}/tx/${hash}` : hash;
};

const chainIdForNetwork = (network: Pick<Network, 'caipId' | 'chainId'>) => network.caipId ?? HYPERCORE_CAIP_ID;

const mapFillToTransaction = (
  fill: UserFill,
  timeMs: number,
  network: Pick<Network, 'explorerUrl' | 'caipId' | 'chainId'>,
): Transaction => {
  const isBuy = fill.side === 'B';
  const ticker = tickerOfCoin(fill.coin);

  const token: TxToken = {
    type: TokenType.NATIVE,
    name: fill.coin,
    symbol: ticker,
    amount: fill.sz,
    imageUri: hyperliquidCoinSvgUrl(fill.coin),
  };

  return {
    isContractCall: false,
    isIncoming: isBuy,
    isOutgoing: !isBuy,
    isSender: !isBuy,
    timestamp: timeMs,
    hash: fill.hash,
    from: '',
    to: '',
    tokens: [token],
    gasUsed: '0',
    txType: TransactionType.FILL_ORDER,
    method: encodeHypercoreFillMethod({
      dir: fill.dir ?? '',
      px: fill.px,
      closedPnl: fill.closedPnl,
      coin: fill.coin,
    }),
    chainId: chainIdForNetwork(network),
    explorerLink: explorerTxLink(network, fill.hash),
  };
};

const mapLedgerToTransaction = (
  update: HypercoreLedgerUpdate,
  evmAddress: string,
  network: Pick<Network, 'explorerUrl' | 'caipId' | 'chainId'>,
): Transaction => {
  const display = getHypercoreLedgerDisplay(update, evmAddress);
  const isIncoming = display.direction === 'positive';
  const isOutgoing = display.direction === 'negative';

  let txType: TransactionType = TransactionType.TRANSFER;
  switch (display.label) {
    case 'deposit':
    case 'received':
      txType = TransactionType.RECEIVE;
      break;
    case 'withdraw':
    case 'sent':
      txType = TransactionType.SEND;
      break;
    case 'liquidation':
      txType = TransactionType.UNKNOWN;
      break;
    default:
      txType = TransactionType.TRANSFER;
  }

  const amount = display.amount || '0';
  const token: TxToken = {
    type: TokenType.NATIVE,
    name: display.symbol,
    symbol: display.symbol,
    amount,
    imageUri: hyperliquidCoinSvgUrl(display.symbol),
  };

  return {
    isContractCall: false,
    isIncoming,
    isOutgoing,
    isSender: isOutgoing,
    timestamp: toTimeMs(update.time),
    hash: update.hash,
    from: display.from ?? (isOutgoing ? evmAddress : ''),
    to: display.to ?? (isIncoming ? evmAddress : ''),
    tokens: [token],
    gasUsed: '0',
    txType,
    chainId: chainIdForNetwork(network),
    explorerLink: explorerTxLink(network, update.hash),
  };
};

export const mapHypercoreActivityToTransactions = (
  items: readonly HypercoreActivityItem[],
  evmAddress: string,
  network: Pick<Network, 'explorerUrl' | 'caipId' | 'chainId'>,
): Transaction[] =>
  items.map((item) =>
    item.kind === 'fill'
      ? mapFillToTransaction(item.fill, item.timeMs, network)
      : mapLedgerToTransaction(item.update, evmAddress, network),
  );
