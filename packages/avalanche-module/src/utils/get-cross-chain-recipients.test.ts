import { TransferableOutput } from '@avalabs/avalanchejs';
import { NetworkVMType, TxType } from '@avalabs/vm-module-types';

import { getCrossChainRecipients, getExportRecipients, getImportRecipients } from './get-cross-chain-recipients';

const AVAX_ASSET_ID = 'FvwEAhmxKfeiG8SnEvq42hc6whRyY3EFYAvebMqDNDGCgxN5Z';

// Fixed owner bytes and the bech32 forms they encode to, so the formatting is asserted
// against literals rather than against the same call the implementation makes.
const OWNER_BYTES = new Uint8Array(20).fill(1);
const OTHER_OWNER_BYTES = new Uint8Array(20).fill(2);

const OWNER_X = 'X-avax1qyqszqgpqyqszqgpqyqszqgpqyqszqgp83vh5p';
const OWNER_P = 'P-avax1qyqszqgpqyqszqgpqyqszqgpqyqszqgp83vh5p';
const OWNER_X_FUJI = 'X-fuji1qyqszqgpqyqszqgpqyqszqgpqyqszqgptrggc7';
const OTHER_OWNER_X = 'X-avax1qgpqyqszqgpqyqszqgpqyqszqgpqyqszk42jlh';

const transferableOutput = (owners: Uint8Array[], amount = 1_000_000n) =>
  TransferableOutput.fromNative(AVAX_ASSET_ID, amount, owners);

describe('getExportRecipients', () => {
  it('reads the exported outputs of a P/X-Chain export', () => {
    const tx = { outs: [transferableOutput([OWNER_BYTES])] };

    expect(getExportRecipients({ tx, destination: NetworkVMType.PVM, isTestnet: false })).toEqual([OWNER_P]);
  });

  it('reads the exported outputs of a C-Chain export', () => {
    const tx = { exportedOutputs: [transferableOutput([OWNER_BYTES])] };

    expect(getExportRecipients({ tx, destination: NetworkVMType.AVM, isTestnet: false })).toEqual([OWNER_X]);
  });

  it('formats for the destination chain and network', () => {
    const tx = { outs: [transferableOutput([OWNER_BYTES])] };

    expect(getExportRecipients({ tx, destination: NetworkVMType.AVM, isTestnet: true })).toEqual([OWNER_X_FUJI]);
  });

  it('lists every owner of a multisig output, without duplicates', () => {
    const tx = {
      outs: [transferableOutput([OWNER_BYTES, OTHER_OWNER_BYTES]), transferableOutput([OWNER_BYTES])],
    };

    expect(getExportRecipients({ tx, destination: NetworkVMType.AVM, isTestnet: false })).toEqual([
      OWNER_X,
      OTHER_OWNER_X,
    ]);
  });

  it('returns nothing for a shape it does not recognise', () => {
    expect(getExportRecipients({ tx: {}, destination: NetworkVMType.AVM, isTestnet: false })).toEqual([]);
  });
});

describe('getImportRecipients', () => {
  it('reads the base transaction outputs of a P/X-Chain import', () => {
    const tx = { baseTx: { outputs: [transferableOutput([OWNER_BYTES])] } };

    expect(getImportRecipients({ tx, chain: NetworkVMType.AVM, isTestnet: false })).toEqual([OWNER_X]);
  });

  it('reads the EVM outputs of a C-Chain import as hex addresses', () => {
    const evmAddress = '0x1234567890123456789012345678901234567890';
    const tx = { Outs: [{ address: { toHex: () => evmAddress } }] };

    expect(getImportRecipients({ tx, chain: NetworkVMType.EVM, isTestnet: false })).toEqual([evmAddress]);
  });
});

describe('getCrossChainRecipients', () => {
  it('resolves recipients for export and import transactions', () => {
    const exportTx = { outs: [transferableOutput([OWNER_BYTES])] };
    const importTx = { baseTx: { outputs: [transferableOutput([OWNER_BYTES])] } };

    expect(getCrossChainRecipients(exportTx, { type: TxType.Export, destination: NetworkVMType.AVM }, false)).toEqual([
      OWNER_X,
    ]);
    expect(getCrossChainRecipients(importTx, { type: TxType.Import, chain: NetworkVMType.AVM }, false)).toEqual([
      OWNER_X,
    ]);
  });

  it('leaves other transaction types alone', () => {
    expect(getCrossChainRecipients({}, { type: TxType.Base, chain: NetworkVMType.AVM }, false)).toBeUndefined();
  });
});
