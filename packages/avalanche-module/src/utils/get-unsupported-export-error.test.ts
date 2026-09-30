import { Common, TransferableOutput, TypeSymbols } from '@avalabs/avalanchejs';
import { NetworkVMType, TxType } from '@avalabs/vm-module-types';
import { EXPORT_PARSE_ERROR, INVALID_EXPORT_ERROR, getUnsupportedExportError } from './get-unsupported-export-error';

const AVAX_ASSET_ID = 'FvwEAhmxKfeiG8SnEvq42hc6whRyY3EFYAvebMqDNDGCgxN5Z';
const TOKEN_ASSET_ID = '2QqUTT3XTgR6HLbCLGtjN2uDHHqNyAbAsZZFZGnsyorTy6FuTB';
const OWNER_BYTES = new Uint8Array(20).fill(1);

const createExportOutput = (assetId: string, amount = 1_000_000n) =>
  TransferableOutput.fromNative(assetId, amount, [OWNER_BYTES]);

const createTx = (tx: object, _type: TypeSymbols = TypeSymbols.AvmExportTx) =>
  ({ _type, ...tx }) as unknown as Common.Transaction;

const createTxDetails = (chain: NetworkVMType, destination: NetworkVMType) => ({
  type: TxType.Export as const,
  chain: chain as NetworkVMType.AVM | NetworkVMType.EVM | NetworkVMType.PVM,
  destination: destination as NetworkVMType.AVM | NetworkVMType.EVM | NetworkVMType.PVM,
});

const checker = (
  tx: Common.Transaction,
  txDetails: { type: TxType; chain?: NetworkVMType; destination?: NetworkVMType },
) =>
  getUnsupportedExportError({
    tx,
    txDetails: txDetails as Parameters<typeof getUnsupportedExportError>[0]['txDetails'],
    avaxAssetId: AVAX_ASSET_ID,
  });

const toC = createTxDetails(NetworkVMType.AVM, NetworkVMType.EVM);
const fromC = createTxDetails(NetworkVMType.EVM, NetworkVMType.AVM);

describe('getUnsupportedExportError', () => {
  describe('exports to the C-Chain', () => {
    it('allows an AVAX only export', () => {
      const tx = createTx({ outs: [createExportOutput(AVAX_ASSET_ID)] });

      expect(checker(tx, toC)).toBeUndefined();
    });

    it('rejects a non-AVAX export', () => {
      const tx = createTx({ outs: [createExportOutput(AVAX_ASSET_ID), createExportOutput(TOKEN_ASSET_ID)] });

      expect(checker(tx, toC)?.message).toContain(INVALID_EXPORT_ERROR);
    });

    it('rejects a non-AVAX export from the P-Chain', () => {
      const tx = createTx({ outs: [createExportOutput(TOKEN_ASSET_ID)] }, TypeSymbols.PvmExportTx);

      expect(checker(tx, createTxDetails(NetworkVMType.PVM, NetworkVMType.EVM))?.message).toContain(
        INVALID_EXPORT_ERROR,
      );
    });

    it('allows an AVAX only export even if baseTx contains a non-AVAX asset', () => {
      const tx = createTx({
        outs: [createExportOutput(AVAX_ASSET_ID)],
        baseTx: { outputs: [createExportOutput(TOKEN_ASSET_ID)] },
      });

      expect(checker(tx, toC)).toBeUndefined();
    });

    it('rejects invalid export transactions', () => {
      const tx = createTx({ outs: [createExportOutput(TOKEN_ASSET_ID)] }, TypeSymbols.AvmBaseTx);

      expect(checker(tx, toC)?.message).toContain(EXPORT_PARSE_ERROR);
    });
  });

  describe('exports from the C-Chain', () => {
    it('allows an AVAX only export', () => {
      const tx = createTx({ exportedOutputs: [createExportOutput(AVAX_ASSET_ID)] }, TypeSymbols.EvmExportTx);

      expect(checker(tx, fromC)).toBeUndefined();
    });

    it('rejects a non-AVAX export', () => {
      const tx = createTx(
        { exportedOutputs: [createExportOutput(AVAX_ASSET_ID), createExportOutput(TOKEN_ASSET_ID)] },
        TypeSymbols.EvmExportTx,
      );

      expect(checker(tx, fromC)?.message).toContain(INVALID_EXPORT_ERROR);
    });

    it('rejects invalid export transactions', () => {
      const tx = createTx({ exportedOutputs: [createExportOutput(TOKEN_ASSET_ID)] }, TypeSymbols.EvmImportTx);

      expect(checker(tx, fromC)?.message).toContain(EXPORT_PARSE_ERROR);
    });
  });

  it('allows a non-AVAX export between the X-Chain and the P-Chain', () => {
    const tx = createTx({ outs: [createExportOutput(TOKEN_ASSET_ID)] });

    expect(checker(tx, createTxDetails(NetworkVMType.AVM, NetworkVMType.PVM))).toBeUndefined();
  });

  it('returns undefined for non-export transactions', () => {
    const tx = createTx({ outs: [createExportOutput(TOKEN_ASSET_ID)] });

    expect(checker(tx, { type: TxType.Base })).toBeUndefined();
  });
});
