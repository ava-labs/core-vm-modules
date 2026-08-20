import { networkIDs, utils } from '@avalabs/avalanchejs';
import { NetworkVMType, TxType, type VM } from '@avalabs/vm-module-types';

/**
 * Reads the addresses that receive the funds of an export or import transaction.
 *
 * The parsed transaction details only carry the amount and the two chains, so an export whose
 * exported output belongs to somebody else was displayed exactly like one that pays the user
 * back on the other chain. These are part of the signed bytes, so they are read straight from
 * the transaction rather than from anything the request supplied alongside it.
 *
 * Returns an empty list for a shape we don't recognise: showing no recipient is what the
 * screen did before, whereas showing a wrong one would be worse than showing none.
 */

const CHAIN_ALIASES: Record<VM, string> = {
  [NetworkVMType.AVM]: 'X',
  [NetworkVMType.PVM]: 'P',
  [NetworkVMType.EVM]: 'C',
};

type Amounter = { getOwners?: () => Uint8Array[] };
type TransferableOutputLike = { output: Amounter };
type EvmOutputLike = { address: { toHex: () => string } };

const hasOwners = (output: unknown): output is TransferableOutputLike =>
  typeof (output as TransferableOutputLike)?.output?.getOwners === 'function';

const isEvmOutput = (output: unknown): output is EvmOutputLike =>
  typeof (output as EvmOutputLike)?.address?.toHex === 'function';

const formatOwners = (outputs: readonly unknown[], chainAlias: string, hrp: string): string[] => {
  const recipients = outputs.flatMap((output) => {
    if (isEvmOutput(output)) {
      // C-Chain outputs are plain EVM addresses rather than bech32 ones.
      return [output.address.toHex()];
    }

    if (!hasOwners(output)) {
      return [];
    }

    return (output.output.getOwners?.() ?? []).map((owner) => utils.format(chainAlias, hrp, owner));
  });

  return [...new Set(recipients)];
};

// Any avalanchejs transaction. The four export/import shapes differ per chain and the fields
// we read are checked structurally, so this deliberately does not name a union that would
// have to track the library's class hierarchy.
type CrossChainTx = object;

export const getExportRecipients = ({
  tx,
  destination,
  isTestnet,
}: {
  tx: CrossChainTx;
  destination: VM;
  isTestnet: boolean;
}): string[] => {
  // P/X-Chain exports keep the exported outputs in `outs`, the C-Chain in `exportedOutputs`.
  // Neither includes the change that stays behind on the source chain.
  const candidate = tx as unknown as { outs?: readonly unknown[]; exportedOutputs?: readonly unknown[] };
  const outputs = candidate.exportedOutputs ?? candidate.outs;

  if (!Array.isArray(outputs)) {
    return [];
  }

  return formatOwners(
    outputs,
    CHAIN_ALIASES[destination],
    networkIDs.getHRP(isTestnet ? networkIDs.FujiID : networkIDs.MainnetID),
  );
};

export const getImportRecipients = ({
  tx,
  chain,
  isTestnet,
}: {
  tx: CrossChainTx;
  chain: VM;
  isTestnet: boolean;
}): string[] => {
  // Imported funds land in the base transaction's outputs on P/X, and in `Outs` on the
  // C-Chain.
  const candidate = tx as unknown as { Outs?: readonly unknown[]; baseTx?: { outputs?: readonly unknown[] } };
  const outputs = candidate.Outs ?? candidate.baseTx?.outputs;

  if (!Array.isArray(outputs)) {
    return [];
  }

  return formatOwners(
    outputs,
    CHAIN_ALIASES[chain],
    networkIDs.getHRP(isTestnet ? networkIDs.FujiID : networkIDs.MainnetID),
  );
};

/**
 * Picks the right recipient lookup for a transaction's type, or undefined when the type does
 * not move funds across chains.
 */
export const getCrossChainRecipients = (
  tx: CrossChainTx,
  txDetails: { type: TxType; chain?: VM; destination?: VM },
  isTestnet: boolean,
): string[] | undefined => {
  if (txDetails.type === TxType.Export && txDetails.destination) {
    return getExportRecipients({ tx, destination: txDetails.destination, isTestnet });
  }

  if (txDetails.type === TxType.Import && txDetails.chain) {
    return getImportRecipients({ tx, chain: txDetails.chain, isTestnet });
  }

  return undefined;
};
