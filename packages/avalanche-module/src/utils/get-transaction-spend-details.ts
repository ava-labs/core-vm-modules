import { avaxSerial, Common, evmSerial, utils, type Utxo } from '@avalabs/avalanchejs';

export type TransactionSpendDetails = {
  spentAmounts: Record<string, bigint>;
  unknownAddresses: string[];
};

const _getAddresses = (owners: { addrs: { toBytes: () => Uint8Array }[] } | undefined) =>
  (owners?.addrs ?? []).map((address) => utils.bufferToHex(address.toBytes()));

const _getOwners = (output: avaxSerial.TransferableOutput['output']) => {
  if (utils.isTransferOut(output) || utils.isNftTransferOut(output)) {
    return _getAddresses(output.outputOwners);
  }

  if (utils.isStakeableLockOut(output) || utils.isNftMintOut(output) || utils.isSecpMintOut(output)) {
    return _getAddresses(output.getOutputOwners());
  }

  return [];
};

const _add = (amounts: Record<string, bigint>, assetId: string, amount: bigint) => {
  amounts[assetId] = (amounts[assetId] ?? 0n) + amount;
};

export const getTransactionSpendDetails = ({
  tx,
  inputUtxos,
  signerAddresses,
}: {
  tx: Common.Transaction;
  inputUtxos: readonly Utxo[];
  signerAddresses: readonly Uint8Array[];
}): TransactionSpendDetails => {
  const signerAddressesBytes = new Set(signerAddresses.map(utils.bufferToHex));
  const spentAmounts: Record<string, bigint> = {};

  for (const utxo of inputUtxos) {
    const owners = _getAddresses(utxo.getOutputOwners());

    if (owners.some((owner) => signerAddressesBytes.has(owner))) {
      const output = utxo.output as avaxSerial.TransferableOutput['output'];

      _add(spentAmounts, utxo.getAssetId(), output.amount());
    }
  }

  if (evmSerial.isExportTx(tx)) {
    for (const input of tx.ins) {
      if (signerAddressesBytes.has(utils.bufferToHex(input.address.toBytes()))) {
        _add(spentAmounts, input.assetId.toString(), input.amount.value());
      }
    }
  }

  if (evmSerial.isImportTx(tx)) {
    for (const output of tx.Outs) {
      if (signerAddressesBytes.has(utils.bufferToHex(output.address.toBytes()))) {
        _add(spentAmounts, output.assetId.toString(), 0n - output.amount.value());
      }
    }
  }

  const { baseTx } = tx as { baseTx?: { outputs?: readonly avaxSerial.TransferableOutput[] } };
  const changeOutputs = Array.isArray(baseTx?.outputs) ? baseTx.outputs : [];
  const unknownAddresses = new Set<string>();

  for (const output of changeOutputs) {
    const owners = _getOwners(output.output);

    owners.forEach((owner) => {
      if (signerAddressesBytes.size > 0 && !signerAddressesBytes.has(owner)) {
        unknownAddresses.add(owner);
      }
    });

    if (owners.some((owner) => signerAddressesBytes.has(owner))) {
      _add(spentAmounts, output.getAssetId(), 0n - output.amount());
    }
  }

  return {
    spentAmounts: Object.fromEntries(Object.entries(spentAmounts).filter(([, amount]) => amount > 0n)),
    unknownAddresses: [...unknownAddresses],
  };
};
