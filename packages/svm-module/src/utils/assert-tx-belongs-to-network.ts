import {
  type Blockhash,
  type CompiledTransactionMessage,
  getCompiledTransactionMessageDecoder,
  getTransactionDecoder,
} from '@solana/kit';
import type { SolanaProvider } from '@avalabs/core-wallets-sdk';
import type { Network } from '@avalabs/vm-module-types';

const SYSTEM_PROGRAM_ADDRESS = '11111111111111111111111111111111';
// System instruction index (u32 little-endian) for AdvanceNonceAccount.
const ADVANCE_NONCE_ACCOUNT_INSTRUCTION = 4;

// A durable-nonce transaction's lifetime is a nonce account rather than a
// blockhash, and its first instruction must be a System `AdvanceNonceAccount`.
// Such transactions carry the nonce (not a recent blockhash) in `lifetimeToken`,
// so the blockhash check below does not apply to them.
const isDurableNonceTransaction = (message: CompiledTransactionMessage): boolean => {
  const [firstInstruction] = message.instructions;

  if (
    !firstInstruction?.data ||
    message.staticAccounts[firstInstruction.programAddressIndex] !== SYSTEM_PROGRAM_ADDRESS
  ) {
    return false;
  }

  const { data } = firstInstruction;

  return (
    data.length >= 4 && data[0] === ADVANCE_NONCE_ACCOUNT_INSTRUCTION && data[1] === 0 && data[2] === 0 && data[3] === 0
  );
};

/**
 * Solana messages carry no chain id, so the recent blockhash is the only thing
 * binding a transaction to a cluster. A dApp could request signing under a
 * `solana:devnet` scope - which is what the scanner and the action metadata are
 * derived from - while supplying a transaction built on a fresh Mainnet
 * blockhash, then submit the returned signature to Mainnet. Verify the blockhash
 * is actually known on the cluster we are signing for.
 *
 * Decode / transport failures fail open - the signer or RPC rejects a genuinely
 * broken transaction anyway, and a dApp cannot choose whether our own RPC call
 * succeeds.
 *
 * Returns an error message when the transaction does not belong to `network`, or
 * `null` when it is valid or cannot be determined.
 */
export const assertTxBelongsToNetwork = async ({
  serializedTx,
  provider,
  network,
}: {
  serializedTx: string;
  provider: SolanaProvider;
  network: Network;
}): Promise<string | null> => {
  let blockhash: Blockhash;

  try {
    const transaction = getTransactionDecoder().decode(Uint8Array.from(Buffer.from(serializedTx, 'base64')));
    const message = getCompiledTransactionMessageDecoder().decode(transaction.messageBytes);

    if (isDurableNonceTransaction(message)) {
      return null;
    }

    blockhash = message.lifetimeToken as Blockhash;
  } catch {
    return null;
  }

  try {
    const { value: isValid } = await provider.isBlockhashValid(blockhash).send();

    if (!isValid) {
      return `This transaction was not built for ${network.chainName}. Its blockhash is unknown on this network, so signing it could authorize a transfer on a different Solana cluster.`;
    }
  } catch {
    return null;
  }

  return null;
};
