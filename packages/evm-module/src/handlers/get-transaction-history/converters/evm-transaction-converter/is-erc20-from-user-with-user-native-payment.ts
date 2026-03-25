import type { TransactionDetails } from '@avalabs/glacier-sdk';

/**
 * True when the user both (1) is `from` on at least one ERC-20 transfer and (2) pays non-zero native
 * (`nativeTransaction` value from the user) in the same transaction.
 *
 * Indexers attach the native leg alongside the ERC-20 leg; per-token activity filters (e.g. “ETH only”)
 * then pick up those txs even when the user-facing movement is the token. Common for bridge / CCIP-style
 * flows where the native leg is often a fee, but the native amount is not validated as fee-only.
 *
 * False when the user spends ETH through a router/pool but is not `from` on an ERC-20 transfer (typical
 * ETH → token swap-then-bridge in one tx): native remains in the token list for ETH-scoped views.
 */
export function isErc20FromUserWithUserNativePayment(
  nativeTransaction: TransactionDetails['nativeTransaction'],
  erc20Transfers: TransactionDetails['erc20Transfers'],
  userAddress: string,
): boolean {
  const address = userAddress.toLowerCase();
  const userPaidNative = nativeTransaction.value !== '0' && nativeTransaction.from.address.toLowerCase() === address;
  const erc20FromUser = erc20Transfers?.some((t) => t.from.address.toLowerCase() === address) ?? false;
  return erc20FromUser && userPaidNative;
}
