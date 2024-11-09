import { type NetworkToken, XChainNonLinearTransaction, XChainLinearTransaction } from '@avalabs/glacier-sdk';
import Big from 'big.js';
import { Avalanche } from '@avalabs/core-wallets-sdk';
import { TokenType, type Transaction } from '@avalabs/vm-module-types';
import { getExplorerAddressByNetwork, getTokenValue } from './utils';

export function convertXChainTransaction({
  tx,
  address,
  networkToken,
  chainId,
  explorerUrl,
  isTestnet,
}: {
  tx: XChainNonLinearTransaction | XChainLinearTransaction;
  address: string;
  networkToken: NetworkToken;
  chainId: number;
  isTestnet?: boolean;
  explorerUrl?: string;
}): Transaction {
  const froms = new Set(tx.consumedUtxos.flatMap((utxo) => utxo.addresses) || []);
  const tos = new Set(tx.emittedUtxos.flatMap((utxo) => utxo.addresses) || []);
  const chainAddress = address.toLowerCase().startsWith('x-') ? address.slice(2) : address;
  const isImportExport = ['ImportTx', 'ExportTx'].includes(tx.txType);

  const { amount: amountSpent, isSender } = getAmount({
    tx,
    isTestnet,
    networkToken,
    chainAddress,
    isImportExport,
  });
  const avaxBurnedAmount = getBurnedAmount({ isTestnet, tx, networkToken });
  const amountToDisplay = isImportExport
    ? amountSpent.toString()
    : isSender
    ? amountSpent.minus(avaxBurnedAmount).toString()
    : amountSpent.toString();

  return {
    hash: tx.txHash,
    isContractCall: false,
    isIncoming: !isSender,
    isOutgoing: isSender,
    from: [...froms.values()].join(','),
    to: [...tos.values()].join(','),
    isSender,
    timestamp: tx.timestamp * 1000, // to millis
    tokens: [
      {
        decimal: networkToken.decimals.toString(),
        name: networkToken.name,
        symbol: networkToken.symbol,
        type: TokenType.NATIVE,
        amount: amountToDisplay,
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
  chainAddress,
  isImportExport,
}: {
  tx: XChainNonLinearTransaction | XChainLinearTransaction;
  isTestnet?: boolean;
  networkToken: NetworkToken;
  chainAddress: string;
  isImportExport: boolean;
}): { amount: Big; isSender: boolean } {
  if (isImportExport) {
    const xBlockchainId = isTestnet ? Avalanche.FujiContext.xBlockchainID : Avalanche.MainnetContext.xBlockchainID;
    const amount = tx.emittedUtxos
      .filter(
        (utxo) =>
          utxo.asset.assetId === getAvaxAssetId(!!isTestnet) &&
          ((tx.txType === 'ImportTx' && utxo.consumedOnChainId === xBlockchainId) ||
            (tx.txType === 'ExportTx' && utxo.consumedOnChainId !== xBlockchainId)),
      )
      .reduce((agg, utxo) => agg.add(utxo.asset.amount), new Big(0));

    return { amount: getTokenValue({ amount: amount.toNumber(), decimals: networkToken.decimals }), isSender: true };
  }

  const consumedAmountOfAddress = tx.consumedUtxos
    .filter((utxo) => utxo.asset.assetId === getAvaxAssetId(!!isTestnet) && utxo.addresses.includes(chainAddress))
    .reduce((accumulator, utxo) => accumulator.add(utxo.asset.amount), new Big(0));

  const changeAmountOfAddress = tx.emittedUtxos
    .filter((utxo) => utxo.asset.assetId === getAvaxAssetId(!!isTestnet) && utxo.addresses.includes(chainAddress))
    .reduce((accumulator, utxo) => accumulator.add(utxo.asset.amount), new Big(0));

  const isSender = consumedAmountOfAddress.gte(changeAmountOfAddress);
  const amount = isSender
    ? consumedAmountOfAddress.minus(changeAmountOfAddress)
    : changeAmountOfAddress.minus(consumedAmountOfAddress);

  return {
    amount: getTokenValue({
      amount: amount.toNumber(),
      decimals: networkToken.decimals,
    }),
    isSender,
  };
}

function getBurnedAmount({
  isTestnet,
  tx,
  networkToken,
}: {
  isTestnet?: boolean;
  tx: XChainNonLinearTransaction | XChainLinearTransaction;
  networkToken: NetworkToken;
}): Big {
  const totalAmountUnlocked = tx.amountUnlocked
    .filter((asset) => asset.assetId === getAvaxAssetId(!!isTestnet))
    .reduce((accumulator, asset) => accumulator.add(asset.amount), new Big(0));
  const totalAmountCreated = tx.amountCreated
    .filter((asset) => asset.assetId === getAvaxAssetId(!!isTestnet))
    .reduce((accumulator, asset) => accumulator.add(asset.amount), new Big(0));
  const nAvaxFee = totalAmountUnlocked.minus(totalAmountCreated);
  return getTokenValue({ amount: nAvaxFee.toNumber(), decimals: networkToken.decimals });
}

function getAvaxAssetId(isTestnet: boolean): string {
  return isTestnet ? Avalanche.FujiContext.avaxAssetID : Avalanche.MainnetContext.avaxAssetID;
}
