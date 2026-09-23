import type { Utxo } from '@avalabs/avalanchejs';

import { resolveUtxos } from './resolve-utxos';
import { getProvidedUtxos } from './get-provided-utxos';

jest.mock('./get-provided-utxos');

// Structurally-typed doubles: building real UTXOs would require a codec, and only the id is
// relevant here.
const utxo = (txId: string, outputIdx: number) =>
  ({
    utxoId: { txID: { toString: () => txId }, outputIdx: { value: () => outputIdx } },
  }) as unknown as Utxo;

describe('resolveUtxos', () => {
  const vm = 'AVM' as Parameters<typeof resolveUtxos>[0]['vm'];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('uses the indexed UTXOs when the request provides none', async () => {
    const indexed = [utxo('tx1', 0)];
    jest.mocked(getProvidedUtxos).mockReturnValue([]);

    await expect(resolveUtxos({ utxoHexes: [], vm, getIndexedUtxos: async () => indexed })).resolves.toBe(indexed);
  });

  it('prefers the indexed copy of a UTXO the request also provided', async () => {
    // Same UTXO id, but the request's copy could carry any amount it likes.
    const provided = [utxo('tx1', 0)];
    const indexed = [utxo('tx1', 0)];
    jest.mocked(getProvidedUtxos).mockReturnValue(provided);

    const result = await resolveUtxos({ utxoHexes: ['0x00'], vm, getIndexedUtxos: async () => indexed });

    expect(result).toEqual(indexed);
    expect(result).not.toContain(provided[0]);
  });

  it('keeps provided UTXOs the indexer does not know about', async () => {
    const provided = [utxo('tx-unindexed', 1)];
    const indexed = [utxo('tx1', 0)];
    jest.mocked(getProvidedUtxos).mockReturnValue(provided);

    const result = await resolveUtxos({ utxoHexes: ['0x00'], vm, getIndexedUtxos: async () => indexed });

    expect(result).toEqual([...indexed, ...provided]);
  });

  it('falls back to the provided UTXOs when the indexer cannot be reached', async () => {
    const provided = [utxo('tx1', 0)];
    jest.mocked(getProvidedUtxos).mockReturnValue(provided);

    const result = await resolveUtxos({
      utxoHexes: ['0x00'],
      vm,
      getIndexedUtxos: async () => {
        throw new Error('glacier is down');
      },
    });

    expect(result).toBe(provided);
  });

  it('passes the request hexes through to the decoder', async () => {
    jest.mocked(getProvidedUtxos).mockReturnValue([]);

    await resolveUtxos({ utxoHexes: ['0xabc'], vm, getIndexedUtxos: async () => [] });

    expect(getProvidedUtxos).toHaveBeenCalledWith({ utxoHexes: ['0xabc'], vm });
  });
});
