import { TokenType, TransactionType, type TxToken } from '@avalabs/vm-module-types';

function isFungibleActivityToken(token: TxToken): boolean {
  return token.type === TokenType.NATIVE || token.type === TokenType.ERC20;
}

/**
 * For swap activity, put the wallet's outgoing fungible leg first and incoming second so thin
 * clients can render "A swapped for B" from `tokens[0]` / `tokens[1]` without address matching.
 */
export function orderActivityTokensForWallet(
  tokens: TxToken[],
  txType: TransactionType,
  walletAddress: string,
): TxToken[] {
  if (txType !== TransactionType.SWAP || tokens.length < 2) {
    return tokens;
  }

  const w = walletAddress.toLowerCase();

  const outgoing = tokens.find((t) => isFungibleActivityToken(t) && t.from?.address.toLowerCase() === w);
  const incoming = tokens.find(
    (t) => isFungibleActivityToken(t) && t.to?.address.toLowerCase() === w && t !== outgoing,
  );

  if (outgoing == null || incoming == null) {
    return tokens;
  }

  const rest = tokens.filter((t) => t !== outgoing && t !== incoming);
  return [outgoing, incoming, ...rest];
}
