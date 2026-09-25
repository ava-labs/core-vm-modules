import { Common, TransferableOutput } from '@avalabs/avalanchejs';
import { NetworkVMType, TxType } from '@avalabs/vm-module-types';

import { getUnsupportedExportError } from './get-unsupported-export-error';

const AVAX_ASSET_ID = 'FvwEAhmxKfeiG8SnEvq42hc6whRyY3EFYAvebMqDNDGCgxN5Z';
const TOKEN_ASSET_ID = '2QqUTT3XTgR6HLbCLGtjN2uDHHqNyAbAsZZFZGnsyorTy6FuTB';
const OWNER_BYTES = new Uint8Array(20).fill(1);

const createExportOutput = (assetId: string, amount = 1_000_000n) =>
  TransferableOutput.fromNative(assetId, amount, [OWNER_BYTES]);

const createTxDetails = (destination: NetworkVMType) => ({
  type: TxType.Export as const,
  destination: destination as NetworkVMType.AVM | NetworkVMType.EVM | NetworkVMType.PVM,
});

const checker = (tx: Common.Transaction, txDetails: { type: TxType; destination?: NetworkVMType }) =>
  getUnsupportedExportError({
    tx,
    txDetails: txDetails as Parameters<typeof getUnsupportedExportError>[0]['txDetails'],
    avaxAssetId: AVAX_ASSET_ID,
  });

describe('getUnsupportedExportError', () => {
  it('allows an AVAX only export to the C-Chain', () => {
    const tx = { outs: [createExportOutput(AVAX_ASSET_ID)] } as unknown as Common.Transaction;

    expect(checker(tx, createTxDetails(NetworkVMType.EVM))).toBeUndefined();
  });

  it('rejects a non-AVAX export to the C-Chain', () => {
    const tx = {
      outs: [createExportOutput(AVAX_ASSET_ID), createExportOutput(TOKEN_ASSET_ID)],
    } as unknown as Common.Transaction;

    expect(checker(tx, createTxDetails(NetworkVMType.EVM))?.message).toContain(
      `Can't export non-AVAX assets to C-Chain`,
    );
  });

  it('allows an AVAX only export even if baseTx contains a non-AVAX asset', () => {
    const tx = {
      outs: [createExportOutput(AVAX_ASSET_ID)],
      baseTx: { outputs: [createExportOutput(TOKEN_ASSET_ID)] },
    } as unknown as Common.Transaction;

    expect(checker(tx, createTxDetails(NetworkVMType.EVM))).toBeUndefined();
  });

  it('allows a non-AVAX only export between the X-Chain and the P-Chain', () => {
    const tx = { outs: [createExportOutput(TOKEN_ASSET_ID)] } as unknown as Common.Transaction;

    expect(checker(tx, createTxDetails(NetworkVMType.PVM))).toBeUndefined();
  });

  it('rejects invalid export transactions', () => {
    expect(
      checker(
        { outs: [createExportOutput(TOKEN_ASSET_ID)] } as unknown as Common.Transaction,
        createTxDetails(NetworkVMType.EVM),
      )?.message,
    ).toContain('Error while parsing exported outputs');
  });
});
