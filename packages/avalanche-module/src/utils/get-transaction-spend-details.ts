import { avaxSerial, Common, evmSerial, utils, type Utxo } from '@avalabs/avalanchejs';

export type TransactionSpendDetails = {
  spentAmounts: Record<string, bigint>;
  unknownAddresses: string[];
};

const _getAddresses = (owners: { addrs: { toBytes: () => Uint8Array }[] } | undefined) =>
  (owners?.addrs ?? []).map((address) => utils.bufferToHex(address.toBytes()));

const _getOutputOwners = (output: avaxSerial.TransferableOutput['output']) => {
  if (utils.isTransferOut(output) || utils.isNftTransferOut(output)) {
    return output.outputOwners;
  }

  if (utils.isStakeableLockOut(output) || utils.isNftMintOut(output) || utils.isSecpMintOut(output)) {
    return output.getOutputOwners();
  }

  return undefined;
};

// an output is only owned by the singer if it can be only spent by the signer addresses and not by any other addresses
const _isSolelyOwnedBySigners = (owners: string[], threshold: number, signerAddressesBytes: Set<string>) => {
  const signerOwnerCount = owners.filter((owner) => signerAddressesBytes.has(owner)).length;

  return signerOwnerCount >= threshold && owners.length - signerOwnerCount < threshold;
};

const _add = (amounts: Record<string, bigint>, assetId: string, amount: bigint) => {
  amounts[assetId] = (amounts[assetId] ?? 0n) + amount;
};

export const getTransactionSpendDetails = ({
  tx,
  inputUtxos,
  xpSignerAddresses,
  evmSignerAddresses,
}: {
  tx: Common.Transaction;
  inputUtxos: readonly Utxo[];
  xpSignerAddresses: readonly Uint8Array[];
  evmSignerAddresses: readonly Uint8Array[];
}): TransactionSpendDetails => {
  const xpSignerAddressesBytes = new Set(xpSignerAddresses.map(utils.bufferToHex));
  const evmSignerAddressesBytes = new Set(evmSignerAddresses.map(utils.bufferToHex));
  const spentAmounts: Record<string, bigint> = {};

  for (const utxo of inputUtxos) {
    const owners = _getAddresses(utxo.getOutputOwners());

    if (owners.some((owner) => xpSignerAddressesBytes.has(owner))) {
      const output = utxo.output as avaxSerial.TransferableOutput['output'];

      _add(spentAmounts, utxo.getAssetId(), output.amount());
    }
  }

  if (evmSerial.isExportTx(tx)) {
    for (const input of tx.ins) {
      if (evmSignerAddressesBytes.has(utils.bufferToHex(input.address.toBytes()))) {
        _add(spentAmounts, input.assetId.toString(), input.amount.value());
      }
    }
  }

  if (evmSerial.isImportTx(tx)) {
    for (const output of tx.Outs) {
      if (evmSignerAddressesBytes.has(utils.bufferToHex(output.address.toBytes()))) {
        _add(spentAmounts, output.assetId.toString(), 0n - output.amount.value());
      }
    }
  }

  const { baseTx } = tx as { baseTx?: { outputs?: readonly avaxSerial.TransferableOutput[] } };
  const changeOutputs = Array.isArray(baseTx?.outputs) ? baseTx.outputs : [];
  const unknownAddresses = new Set<string>();

  for (const output of changeOutputs) {
    const outputOwners = _getOutputOwners(output.output);
    const owners = _getAddresses(outputOwners);

    owners.forEach((owner) => {
      if (xpSignerAddressesBytes.size > 0 && !xpSignerAddressesBytes.has(owner)) {
        unknownAddresses.add(owner);
      }
    });

    if (outputOwners && _isSolelyOwnedBySigners(owners, outputOwners.threshold.value(), xpSignerAddressesBytes)) {
      _add(spentAmounts, output.getAssetId(), 0n - output.amount());
    }
  }

  return {
    spentAmounts: Object.fromEntries(Object.entries(spentAmounts).filter(([, amount]) => amount > 0n)),
    unknownAddresses: [...unknownAddresses],
  };
};
