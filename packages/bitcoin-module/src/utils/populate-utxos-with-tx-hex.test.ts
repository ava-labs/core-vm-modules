import type { BitcoinInputUTXO, BitcoinProviderAbstract } from '@avalabs/core-wallets-sdk';
import { populateUtxosWithTxHex } from './populate-utxos-with-tx-hex';

const makeUtxo = (txHash: string, index: number): BitcoinInputUTXO =>
  ({ txHash, index, value: 1000, script: 'script' }) as unknown as BitcoinInputUTXO;

describe('populateUtxosWithTxHex', () => {
  it('attaches the previous tx hex to each utxo', async () => {
    const provider = {
      getTxHex: jest.fn(async (txHash: string) => `hex-${txHash}`),
    } as unknown as BitcoinProviderAbstract;

    const utxos = [makeUtxo('aaa', 0), makeUtxo('bbb', 1)];

    const result = await populateUtxosWithTxHex(utxos, provider);

    expect(result).toEqual([
      { ...utxos[0], txHex: 'hex-aaa' },
      { ...utxos[1], txHex: 'hex-bbb' },
    ]);
  });

  it('fetches each previous tx only once for repeated txHashes', async () => {
    const provider = {
      getTxHex: jest.fn(async (txHash: string) => `hex-${txHash}`),
    } as unknown as BitcoinProviderAbstract;

    const utxos = [makeUtxo('aaa', 0), makeUtxo('aaa', 1), makeUtxo('bbb', 0)];

    const result = await populateUtxosWithTxHex(utxos, provider);

    expect(provider.getTxHex).toHaveBeenCalledTimes(2);
    expect(result.map((utxo) => utxo.txHex)).toEqual(['hex-aaa', 'hex-aaa', 'hex-bbb']);
  });
});
