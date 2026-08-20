import type { Utxo, VM } from '@avalabs/avalanchejs';

import { getProvidedUtxos } from './get-provided-utxos';

/**
 * Resolves the UTXOs a transaction spends, preferring the indexer's copy over the caller's.
 */
export const resolveUtxos = async ({
  utxoHexes,
  vm,
  getIndexedUtxos,
}: {
  utxoHexes?: string[];
  vm: VM;
  getIndexedUtxos: () => Promise<Utxo[]>;
}): Promise<Utxo[]> => {
  const providedUtxos = getProvidedUtxos({ utxoHexes, vm });

  if (!providedUtxos.length) {
    return getIndexedUtxos();
  }

  let indexedUtxos: Utxo[] = [];

  try {
    indexedUtxos = await getIndexedUtxos();
  } catch (err) {
    console.error('Unable to fetch UTXOs from the indexer, falling back to the provided ones', err);
    return providedUtxos;
  }

  const utxoKey = (utxo: Utxo) => `${utxo.utxoId.txID.toString()}:${utxo.utxoId.outputIdx.value()}`;
  const indexedKeys = new Set(indexedUtxos.map(utxoKey));

  return [...indexedUtxos, ...providedUtxos.filter((utxo) => !indexedKeys.has(utxoKey(utxo)))];
};
