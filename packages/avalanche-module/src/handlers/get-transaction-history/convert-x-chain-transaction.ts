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

  const amount = getAmount({
    tx,
    isTestnet,
    networkToken,
  });
  const avaxBurnedAmount = getBurnedAmount({ isTestnet, tx, totalAmountCreated: amount, networkToken });
  const chainAddress = address.toLowerCase().startsWith('x-') ? address.slice(2) : address;
  const isSender = froms.has(chainAddress);

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
}: {
  tx: XChainNonLinearTransaction | XChainLinearTransaction;
  isTestnet?: boolean;
  networkToken: NetworkToken;
}): Big {
  const isImportExport = ['ImportTx', 'ExportTx'].includes(tx.txType);
  const xBlockchainId = isTestnet ? Avalanche.FujiContext.xBlockchainID : Avalanche.MainnetContext.xBlockchainID;
  const importExportAmount = tx.emittedUtxos
    .filter(
      (utxo) =>
        utxo.asset.assetId === getAvaxAssetId(!!isTestnet) &&
        ((tx.txType === 'ImportTx' && utxo.consumedOnChainId === xBlockchainId) ||
          (tx.txType === 'ExportTx' && utxo.consumedOnChainId !== xBlockchainId)),
    )
    .reduce((agg, utxo) => agg.add(utxo.asset.amount), new Big(0));

  const totalAmountCreated = tx.amountCreated
    .filter((asset) => asset.assetId === getAvaxAssetId(!!isTestnet))
    .reduce((accumulator, asset) => accumulator.add(asset.amount), new Big(0));
  const nAvaxAmt = isImportExport ? importExportAmount : totalAmountCreated;
  return getTokenValue({ amount: nAvaxAmt.toNumber(), decimals: networkToken.decimals });
}

function getBurnedAmount({
  isTestnet,
  tx,
  totalAmountCreated,
  networkToken,
}: {
  isTestnet?: boolean;
  tx: XChainNonLinearTransaction | XChainLinearTransaction;
  totalAmountCreated: Big;
  networkToken: NetworkToken;
}): Big {
  const totalAmountUnlocked = tx.amountUnlocked
    .filter((asset) => asset.assetId === getAvaxAssetId(!!isTestnet))
    .reduce((accumulator, asset) => accumulator.add(asset.amount), new Big(0));
  const nAvaxFee = totalAmountUnlocked.minus(totalAmountCreated);
  return getTokenValue({ amount: nAvaxFee.toNumber(), decimals: networkToken.decimals });
}

function getAvaxAssetId(isTestnet: boolean): string {
  return isTestnet ? Avalanche.FujiContext.avaxAssetID : Avalanche.MainnetContext.avaxAssetID;
}
