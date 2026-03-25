import type { MoralisTransaction } from './moralis-types';

function trimOrEmpty(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function positiveTxValueBigInt(value: string | null | undefined): bigint {
  try {
    const n = BigInt(trimOrEmpty(value) || '0');
    return n > 0n ? n : 0n;
  } catch {
    return 0n;
  }
}

/** Same predicate as `isErc20FromUserWithUserNativePayment` (Glacier); Moralis field shapes differ. */
export function isMoralisErc20FromUserWithUserNativePayment(tx: MoralisTransaction, walletAddress: string): boolean {
  const addr = walletAddress.toLowerCase();
  const userSentErc20 = tx.erc20_transfers.some((t) => trimOrEmpty(t.from_address).toLowerCase() === addr);
  if (!userSentErc20) {
    return false;
  }
  const userNativeOut =
    tx.native_transfers.some((n) => trimOrEmpty(n.from_address).toLowerCase() === addr) ||
    (positiveTxValueBigInt(tx.value) > 0n && trimOrEmpty(tx.from_address).toLowerCase() === addr);
  return userNativeOut;
}
