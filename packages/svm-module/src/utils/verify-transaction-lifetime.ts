import { deserializeTransactionMessage } from '@avalabs/core-wallets-sdk';

import type { getProvider } from './get-provider';

/**
 * Checks that a Solana message is actually anchored to the cluster the request claims.
 *
 * A Solana message carries no chain id. Its only tie to a particular cluster is its lifetime
 * constraint - a recent blockhash, or the nonce account of a durable nonce - and neither was
 * ever checked. The requested cluster was used for display, for the scanner's `chain` name and
 * for RPC routing, so a request could say "Devnet", have the approval rendered as Devnet, and
 * carry a Mainnet blockhash; the signature Core returned was then valid on Mainnet.
 *
 * A blockhash also expires on its own after roughly a minute, so a failed check does not prove
 * the message belongs to another cluster - it proves only that this signature will not execute
 * on the cluster the user is looking at. Both readings are worth telling the signer about, and
 * the wording keeps them distinct rather than asserting the stronger one.
 *
 * Fails open. If the lifetime cannot be read or the RPC does not answer, this reports nothing
 * rather than warning on every transaction whenever an RPC call is slow - that would train
 * people to click through the one warning that matters.
 */

type BlockhashLifetime = { blockhash: string };
type NonceLifetime = { nonceAccountAddress: string };

const hasBlockhashLifetime = (lifetime: unknown): lifetime is BlockhashLifetime =>
  typeof (lifetime as BlockhashLifetime)?.blockhash === 'string';

const hasNonceLifetime = (lifetime: unknown): lifetime is NonceLifetime =>
  typeof (lifetime as NonceLifetime)?.nonceAccountAddress === 'string';

export const isTransactionLifetimeOnCluster = async (
  serializedTx: string,
  provider: ReturnType<typeof getProvider>,
): Promise<boolean | undefined> => {
  try {
    const message = await deserializeTransactionMessage(serializedTx, provider);
    const lifetime = (message as { lifetimeConstraint?: unknown }).lifetimeConstraint;

    if (hasBlockhashLifetime(lifetime)) {
      const { value } = await provider.isBlockhashValid(lifetime.blockhash as never).send();
      return value;
    }

    if (hasNonceLifetime(lifetime)) {
      // A durable nonce lives in an account, and that account only exists on the cluster it
      // was created on. If it is not here, this message was not built for here.
      const { value } = await provider.getAccountInfo(lifetime.nonceAccountAddress as never).send();
      return value !== null;
    }

    return undefined;
  } catch {
    return undefined;
  }
};
