import { Utxo, type VM, utils } from '@avalabs/avalanchejs';

export const getProvidedUtxos = ({ utxoHexes = [], vm }: { utxoHexes?: string[]; vm: VM }): Utxo[] => {
  const codec = utils.getManagerForVM(vm).getDefaultCodec();

  return utxoHexes.map((utxoHex) => {
    const utxoBytes = utils.hexToBuffer(utxoHex);
    const utxo = Utxo.fromBytes(utxoBytes, codec)[0];

    // Fail closed: a UTXO we cannot decode must surface as an error rather than
    // be silently dropped, which would change the transaction being signed.
    if (!utxo) {
      throw new Error('Failed to decode provided UTXO');
    }

    return utxo;
  });
};
