import {
  BigIntPr,
  Common,
  OutputOwners,
  pvmSerial,
  TransferableOutput,
  TypeSymbols,
  utils,
  type Utxo,
} from '@avalabs/avalanchejs';

import { getTransactionSpendDetails } from './get-transaction-spend-details';

const AVAX_ASSET_ID = 'FvwEAhmxKfeiG8SnEvq42hc6whRyY3EFYAvebMqDNDGCgxN5Z';
const TOKEN_ASSET_ID = '2QqUTT3XTgR6HLbCLGtjN2uDHHqNyAbAsZZFZGnsyorTy6FuTB';

const SIGNER = new Uint8Array(20).fill(1);
const UNKNOWN = new Uint8Array(20).fill(3);
const EVM_SIGNER = utils.hexToBuffer('0x0102030405060708090a0b0c0d0e0f1011121314');

const createOutput = (amount: bigint, owners: Uint8Array[], assetId = AVAX_ASSET_ID) =>
  TransferableOutput.fromNative(assetId, amount, owners);

const createLockedOutput = (amount: bigint, owners: Uint8Array[], assetId = AVAX_ASSET_ID) =>
  ({
    output: new pvmSerial.StakeableLockOut(new BigIntPr(0n), createOutput(amount, owners, assetId).output),
    getAssetId: () => assetId,
    amount: () => amount,
  }) as unknown as TransferableOutput;

const createUtxo = (amount: bigint, owners: Uint8Array[], assetId = AVAX_ASSET_ID) => {
  const { output } = createOutput(amount, owners, assetId);

  return {
    output,
    getAssetId: () => assetId,
    getOutputOwners: () => OutputOwners.fromNative(owners),
  } as unknown as Utxo;
};

const createTx = (outputs: TransferableOutput[]) => ({ baseTx: { outputs } }) as unknown as Common.Transaction;

const createEvmAmount = (address: Uint8Array, amount: bigint, assetId = AVAX_ASSET_ID) => ({
  address: { toBytes: () => address },
  amount: { value: () => amount },
  assetId: { toString: () => assetId },
});

const getSpendDetails = (utxos: ReturnType<typeof createUtxo>[], outputs: TransferableOutput[], signers = [SIGNER]) =>
  getTransactionSpendDetails({ tx: createTx(outputs), inputUtxos: utxos, signerAddresses: signers });

const getSpendDetailsWithExport = (outs: TransferableOutput[], change: TransferableOutput[], signers = [SIGNER]) =>
  getTransactionSpendDetails({
    tx: { baseTx: { outputs: change }, outs } as unknown as Common.Transaction,
    inputUtxos: [createUtxo(1_000n, [SIGNER])],
    signerAddresses: signers,
  });

describe('getTransactionSpendDetails', () => {
  it('returns the spend of every asset the signer puts in', () => {
    const spendDetails = getSpendDetails(
      [createUtxo(1_000n, [SIGNER]), createUtxo(50n, [SIGNER], TOKEN_ASSET_ID)],
      [createOutput(400n, [SIGNER])],
    );

    expect(spendDetails).toStrictEqual({
      spentAmounts: { [AVAX_ASSET_ID]: 600n, [TOKEN_ASSET_ID]: 50n },
      unknownAddresses: [],
    });
  });

  it('returns the correct spend details when the change returns to the signer', () => {
    const spendDetails = getSpendDetails([createUtxo(1_000n, [SIGNER])], [createOutput(400n, [SIGNER])]);

    expect(spendDetails).toStrictEqual({ spentAmounts: { [AVAX_ASSET_ID]: 600n }, unknownAddresses: [] });
  });

  it('returns the correct spend details when the signer does not own any outputs', () => {
    const spendDetails = getSpendDetails([createUtxo(1_000n, [SIGNER])], [createOutput(400n, [UNKNOWN])]);

    expect(spendDetails).toStrictEqual({
      spentAmounts: { [AVAX_ASSET_ID]: 1_000n },
      unknownAddresses: [utils.bufferToHex(UNKNOWN)],
    });
  });

  it('returns no spent amounts when the signer does not own any inputs', () => {
    const spendDetails = getSpendDetails([createUtxo(1_000n, [UNKNOWN])], [createOutput(400n, [SIGNER])]);

    expect(spendDetails).toStrictEqual({ spentAmounts: {}, unknownAddresses: [] });
  });

  it('returns no spent amounts when the signer receives back the same amount they spent', () => {
    const spendDetails = getSpendDetails([createUtxo(400n, [SIGNER])], [createOutput(400n, [SIGNER])]);

    expect(spendDetails).toStrictEqual({ spentAmounts: {}, unknownAddresses: [] });
  });

  it('returns the correct spent amounts when the signer owns multiple asset outputs', () => {
    const spendDetails = getSpendDetails(
      [createUtxo(1_000n, [SIGNER])],
      [createOutput(400n, [SIGNER]), createOutput(50n, [SIGNER], TOKEN_ASSET_ID)],
    );

    expect(spendDetails).toStrictEqual({ spentAmounts: { [AVAX_ASSET_ID]: 600n }, unknownAddresses: [] });
  });

  it('returns the correct spend details when the signer co-owns an output with an unknown address', () => {
    const spendDetails = getSpendDetails([createUtxo(1_000n, [SIGNER])], [createOutput(400n, [SIGNER, UNKNOWN])]);

    expect(spendDetails).toStrictEqual({
      spentAmounts: { [AVAX_ASSET_ID]: 600n },
      unknownAddresses: [utils.bufferToHex(UNKNOWN)],
    });
  });

  it('returns the correct spend details when the change output is locked', () => {
    const spendDetails = getSpendDetails([createUtxo(1_000n, [SIGNER])], [createLockedOutput(400n, [SIGNER])]);

    expect(spendDetails).toStrictEqual({ spentAmounts: { [AVAX_ASSET_ID]: 600n }, unknownAddresses: [] });
  });

  it('returns the correct spend details when the change output is locked and owned by an unknown address', () => {
    const spendDetails = getSpendDetails([createUtxo(1_000n, [SIGNER])], [createLockedOutput(400n, [UNKNOWN])]);

    expect(spendDetails).toStrictEqual({
      spentAmounts: { [AVAX_ASSET_ID]: 1_000n },
      unknownAddresses: [utils.bufferToHex(UNKNOWN)],
    });
  });

  it('returns no spent amounts when signers are not known', () => {
    const spendDetails = getSpendDetails([createUtxo(1_000n, [SIGNER])], [createOutput(400n, [UNKNOWN])], []);

    expect(spendDetails).toStrictEqual({ spentAmounts: {}, unknownAddresses: [] });
  });

  describe('exports', () => {
    it('returns the correct spend details when an exported output is owned by the signer', () => {
      const spendDetails = getSpendDetailsWithExport([createOutput(600n, [SIGNER])], [createOutput(400n, [SIGNER])]);

      expect(spendDetails).toStrictEqual({ spentAmounts: { [AVAX_ASSET_ID]: 600n }, unknownAddresses: [] });
    });

    it('returns the correct spend details when the exported output is owned by an unknown address', () => {
      const spendDetails = getSpendDetailsWithExport([createOutput(600n, [UNKNOWN])], [createOutput(400n, [SIGNER])]);

      expect(spendDetails).toStrictEqual({ spentAmounts: { [AVAX_ASSET_ID]: 600n }, unknownAddresses: [] });
    });

    it('returns the correct spend details when the change output is owned by an unknown address', () => {
      const spendDetails = getSpendDetailsWithExport([createOutput(600n, [SIGNER])], [createOutput(400n, [UNKNOWN])]);

      expect(spendDetails).toStrictEqual({
        spentAmounts: { [AVAX_ASSET_ID]: 1_000n },
        unknownAddresses: [utils.bufferToHex(UNKNOWN)],
      });
    });
  });

  describe('C-Chain', () => {
    it('returns the correct spend details when the signer exports funds', () => {
      const tx = {
        _type: TypeSymbols.EvmExportTx,
        ins: [createEvmAmount(EVM_SIGNER, 1_000n)],
        exportedOutputs: [],
      } as unknown as Common.Transaction;

      const spendDetails = getTransactionSpendDetails({ tx, inputUtxos: [], signerAddresses: [EVM_SIGNER] });

      expect(spendDetails).toStrictEqual({ spentAmounts: { [AVAX_ASSET_ID]: 1_000n }, unknownAddresses: [] });
    });

    it('returns no spent amounts when the signer does not own the export inputs', () => {
      const tx = {
        _type: TypeSymbols.EvmExportTx,
        ins: [createEvmAmount(UNKNOWN, 1_000n)],
        exportedOutputs: [],
      } as unknown as Common.Transaction;

      const spendDetails = getTransactionSpendDetails({ tx, inputUtxos: [], signerAddresses: [EVM_SIGNER] });

      expect(spendDetails).toStrictEqual({ spentAmounts: {}, unknownAddresses: [] });
    });

    it('returns the correct spend details when the signer imports funds', () => {
      const tx = {
        _type: TypeSymbols.EvmImportTx,
        importedInputs: [],
        Outs: [createEvmAmount(EVM_SIGNER, 1_000n)],
      } as unknown as Common.Transaction;

      const spendDetails = getTransactionSpendDetails({ tx, inputUtxos: [], signerAddresses: [EVM_SIGNER] });

      expect(spendDetails).toStrictEqual({ spentAmounts: {}, unknownAddresses: [] });
    });
  });
});
