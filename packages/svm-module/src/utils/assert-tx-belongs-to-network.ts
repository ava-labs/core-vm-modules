import {
  type Address,
  type Blockhash,
  type CompiledTransactionMessage,
  fetchAddressesForLookupTables,
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

// In a v0 message an instruction account index addresses the static keys
// followed by the addresses loaded from lookup tables (all writable across the
// lookups first, then all readonly). A durable nonce account is a writable
// non-signer, so it can validly live in a lookup table and fall outside
// `staticAccounts`. Resolve the loaded portion via the tables when needed.
const resolveAccountAddress = async (
  message: CompiledTransactionMessage,
  accountIndex: number,
  provider: SolanaProvider,
): Promise<Address | null> => {
  if (accountIndex < message.staticAccounts.length) {
    return message.staticAccounts[accountIndex] ?? null;
  }

  const lookups = 'addressTableLookups' in message ? message.addressTableLookups ?? [] : [];

  if (lookups.length === 0) {
    return null;
  }

  const addressesByTable = await fetchAddressesForLookupTables(
    lookups.map((lookup) => lookup.lookupTableAddress),
    provider,
  );

  const writable = lookups.flatMap((lookup) =>
    lookup.writableIndices.map((index) => addressesByTable[lookup.lookupTableAddress]?.[index]),
  );
  const readonly = lookups.flatMap((lookup) =>
    lookup.readableIndices.map((index) => addressesByTable[lookup.lookupTableAddress]?.[index]),
  );

  return [...writable, ...readonly][accountIndex - message.staticAccounts.length] ?? null;
};

const getDurableNonceAccountAddress = (
  message: CompiledTransactionMessage,
  provider: SolanaProvider,
): Promise<Address | null> => {
  const nonceAccountIndex = message.instructions[0]?.accountIndices?.[0];

  return nonceAccountIndex === undefined
    ? Promise.resolve(null)
    : resolveAccountAddress(message, nonceAccountIndex, provider);
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
    // `processed` (not the default `finalized`) so a freshly created or advanced
    // nonce account is observed in the same state a dApp can legitimately build against.
    const accountInfo = await provider
      .getAccountInfo(nonceAccountAddress, { encoding: 'jsonParsed', commitment: 'processed' })
      .send();
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
    let nonceAccountAddress: Address | null;

    try {
      nonceAccountAddress = await getDurableNonceAccountAddress(message, provider);
    } catch {
      return couldNotVerify(network.chainName);
    }

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
    // `processed` (not the default `finalized`) so a blockhash fetched moments ago
    // is not reported unknown before its slot finalizes.
    const { value: isValid } = await provider
      .isBlockhashValid(message.lifetimeToken as Blockhash, { commitment: 'processed' })
      .send();

    if (!isValid) {
      return lifetimeNotValid(network.chainName, 'blockhash');
    }
  } catch {
    return couldNotVerify(network.chainName);
  }

  return null;
};
