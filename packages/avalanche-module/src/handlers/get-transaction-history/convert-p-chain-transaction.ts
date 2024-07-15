import { type PChainTransaction, type NetworkToken } from '@avalabs/glacier-sdk';
import Big from 'big.js';
import { Avalanche } from '@avalabs/wallets-sdk';
import { TokenType, type Transaction } from '@avalabs/vm-module-types';
import { getExplorerAddressByNetwork, getTokenValue } from './utils';

export function convertPChainTransaction({
  tx,
  address,
  networkToken,
  chainId,
  explorerUrl,
  isTestnet,
}: {
  tx: PChainTransaction;
  address: string;
  networkToken: NetworkToken;
  chainId: number;
  explorerUrl?: string;
  isTestnet?: boolean;
}): Transaction {
  const froms = new Set(tx.consumedUtxos.flatMap((utxo) => utxo.addresses) || []);
  const tos = new Set(tx.emittedUtxos.flatMap((utxo) => utxo.addresses) || []);

  const amount = getAmount({
    tx,
    isTestnet,
    networkToken,
    froms,
  });

  const avaxBurnedAmount = getBurnedAmount({ tx, isTestnet, networkToken });
  const chainAddress = address.toLowerCase().startsWith('p-') ? address.slice(2) : address;
  const isSender = froms.has(chainAddress);

  return {
    hash: tx.txHash,
    isContractCall: false,
    isIncoming: !isSender,
    isOutgoing: isSender,
    from: [...froms.values()].join(','),
    to: [...tos.values()].join(','),
    isSender,
    timestamp: tx.blockTimestamp * 1000, // to millis
    tokens: [
      {
        decimal: networkToken.decimals.toString(),
        name: networkToken.name,
        symbol: networkToken.symbol,
        type: TokenType.NATIVE,
        amount: amount.toString(),
      },
    ],
    gasUsed: avaxBurnedAmount.toString(),
    explorerLink: getExplorerAddressByNetwork(explorerUrl ?? '', tx.txHash, 'tx'),
    txType: tx.txType,
    chainId: chainId.toString(),
  };
}

function getAmount({
  tx,
  isTestnet,
  networkToken,
  froms,
}: {
  tx: PChainTransaction;
  isTestnet?: boolean;
  networkToken: NetworkToken;
  froms: Set<string>;
}): Big {
  const isImportExport = ['ImportTx', 'ExportTx'].includes(tx.txType);
  const isBaseTx = tx.txType === 'BaseTx';

  const nonChangeEmittedUtxosAmt = tx.emittedUtxos
    .filter(
      (utxo) => utxo.asset.assetId === getAvaxAssetId(!!isTestnet) && !utxo.addresses.some((addr) => froms.has(addr)),
    )
    .reduce((agg, utxo) => agg.add(utxo.asset.amount), new Big(0));
  const txValue = tx.value.find((val) => val.assetId === getAvaxAssetId(!!isTestnet))?.amount;
  // This ternary attempts to cover the case where users send themselves AVAX
  // in which case the senders are the recipients and we should use the total tx value.
  const baseTxValue = nonChangeEmittedUtxosAmt.gt(new Big(0))
    ? nonChangeEmittedUtxosAmt
    : txValue
    ? new Big(txValue)
    : new Big(0) ?? new Big(0);

  const pBlockchainId = isTestnet ? Avalanche.FujiContext.pBlockchainID : Avalanche.MainnetContext.pBlockchainID;

  const importExportAmount = tx.emittedUtxos
    .filter(
      (utxo) =>
        utxo.asset.assetId === getAvaxAssetId(!!isTestnet) &&
        ((tx.txType === 'ImportTx' && utxo.consumedOnChainId === pBlockchainId) ||
          (tx.txType === 'ExportTx' && utxo.consumedOnChainId !== pBlockchainId)),
    )
    .reduce((agg, utxo) => agg.add(utxo.amount), new Big(0));
  const nAvaxAmount = isBaseTx
    ? baseTxValue
    : isImportExport
    ? importExportAmount
    : tx.amountStaked.length === 0
    ? aggregateValue(tx.value, !!isTestnet)
    : aggregateValue(tx.amountStaked, !!isTestnet);
  return getTokenValue({ amount: nAvaxAmount?.toNumber(), decimals: networkToken.decimals });
}

function getBurnedAmount({
  tx,
  isTestnet,
  networkToken,
}: {
  tx: PChainTransaction;
  isTestnet?: boolean;
  networkToken: NetworkToken;
}): Big {
  const nAvaxFee = tx.amountBurned
    ?.filter((value) => value.assetId === getAvaxAssetId(!!isTestnet))
    .reduce((accumulator, value) => accumulator.add(value.amount), new Big(0));
  return getTokenValue({ amount: nAvaxFee?.toNumber(), decimals: networkToken.decimals });
}

function aggregateValue(value: PChainTransaction['value'], isTestnet: boolean): Big | undefined {
  return value
    .filter((value_) => value_.assetId === getAvaxAssetId(isTestnet))
    .reduce((accumulator, value_) => accumulator.add(value_.amount), new Big(0));
}

function getAvaxAssetId(isTestnet: boolean): string {
  return isTestnet ? Avalanche.FujiContext.avaxAssetID : Avalanche.MainnetContext.avaxAssetID;
}
