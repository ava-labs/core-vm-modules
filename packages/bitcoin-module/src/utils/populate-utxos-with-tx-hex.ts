import { BitcoinProviderAbstract, type BitcoinInputUTXO } from '@avalabs/core-wallets-sdk';

// The SDK's `createPSBT` (used by every signer at signing time) sets each input's
// `nonWitnessUtxo` from its full previous transaction hex, which `getUtxoBalance`
// doesn't return. Populating it here lets any client sign without re-fetching it.
export const populateUtxosWithTxHex = async (
  utxos: BitcoinInputUTXO[],
  provider: BitcoinProviderAbstract,
): Promise<BitcoinInputUTXO[]> => {
  const txHexByHash = new Map<string, string>();

  await Promise.all(
    [...new Set(utxos.map((utxo) => utxo.txHash))].map(async (txHash) => {
      txHexByHash.set(txHash, await provider.getTxHex(txHash));
    }),
  );

  return utxos.map((utxo) => ({ ...utxo, txHex: txHexByHash.get(utxo.txHash) }));
};
