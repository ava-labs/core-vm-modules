import {
  type Address,
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

const couldNotVerify = (chainName: string) =>
  `Could not verify this transaction belongs to ${chainName}. Signing it could authorize a transfer on a different Solana cluster.`;

const lifetimeNotValid = (chainName: string, kind: 'blockhash' | 'durable nonce') =>
  `This transaction's ${kind} is not valid on ${chainName}. It may have expired, or it may have been built for a different Solana cluster. Signing it could authorize a transfer on another network.`;

// A durable-nonce transaction's lifetime is a nonce account rather than a
// blockhash, and its first instruction must be a System `AdvanceNonceAccount`.
// Such transactions carry the nonce (not a recent blockhash) in `lifetimeToken`.
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

const getDurableNonceAccountAddress = (message: CompiledTransactionMessage): Address | null => {
  const nonceAccountIndex = message.instructions[0]?.accountIndices?.[0];

  return nonceAccountIndex === undefined ? null : message.staticAccounts[nonceAccountIndex] ?? null;
};

const assertDurableNonceBelongsToNetwork = async ({
  nonceAccountAddress,
  nonce,
  provider,
  network,
}: {
  nonceAccountAddress: Address;
  nonce: string;
  provider: SolanaProvider;
  network: Network;
}): Promise<string | null> => {
  try {
    const accountInfo = await provider.getAccountInfo(nonceAccountAddress, { encoding: 'jsonParsed' }).send();
    const data = accountInfo.value?.data;

    if (!data) {
      return `This transaction's durable nonce account is unknown on ${network.chainName}. Signing it could authorize a transfer on a different Solana cluster.`;
    }

    if (Array.isArray(data)) {
      return couldNotVerify(network.chainName);
    }

    const storedNonce = (data.parsed.info as { blockhash?: unknown }).blockhash;

    if (typeof storedNonce !== 'string' || storedNonce !== nonce) {
      return lifetimeNotValid(network.chainName, 'durable nonce');
    }
  } catch {
    return couldNotVerify(network.chainName);
  }

  return null;
};

/**
 * Solana messages carry no chain id, so the recent blockhash (or durable nonce)
 * is the only thing binding a transaction to a cluster. A dApp could request
 * signing under a `solana:devnet` scope - which is what the scanner and the
 * action metadata are derived from - while supplying a transaction built on
 * Mainnet, then submit the returned signature to Mainnet.
 *
 * Fail closed whenever membership cannot be established: `signTransaction`
 * returns a portable signature with no later network operation that would
 * catch a cluster mismatch.
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
  let message: CompiledTransactionMessage;

  try {
    const transaction = getTransactionDecoder().decode(Uint8Array.from(Buffer.from(serializedTx, 'base64')));
    message = getCompiledTransactionMessageDecoder().decode(transaction.messageBytes);
  } catch {
    return couldNotVerify(network.chainName);
  }

  if (isDurableNonceTransaction(message)) {
    const nonceAccountAddress = getDurableNonceAccountAddress(message);

    if (!nonceAccountAddress) {
      return couldNotVerify(network.chainName);
    }

    return assertDurableNonceBelongsToNetwork({
      nonceAccountAddress,
      nonce: message.lifetimeToken,
      provider,
      network,
    });
  }

  try {
    const { value: isValid } = await provider.isBlockhashValid(message.lifetimeToken as Blockhash).send();

    if (!isValid) {
      return lifetimeNotValid(network.chainName, 'blockhash');
    }
  } catch {
    return couldNotVerify(network.chainName);
  }

  return null;
};
