/**
 * Heuristics on Moralis `method_label` (compact, no spaces) for swap vs bridge vs LP — not protocol truth.
 */

export function isSwapLikeMethodCompact(compact: string): boolean {
  if (compact === '') {
    return false;
  }
  const swapSubstrings = [
    'swap',
    'exactinput',
    'exactoutput',
    'aggregat',
    'unoswap',
    'multihop',
    'smartswap',
    'paraswap',
    'kyberswap',
    'odos',
  ];
  return swapSubstrings.some((s) => compact.includes(s));
}

export function isLiquidityProvisionMethodCompact(compact: string): boolean {
  if (compact === '') {
    return false;
  }
  const lpSubstrings = [
    'addliquidity',
    'removeliquidity',
    'increaseliquidity',
    'decreaseliquidity',
    'mintposition',
    'collect',
    'joinpool',
    'exitpool',
    'addethliquidity',
  ];
  return lpSubstrings.some((s) => compact.includes(s));
}

export function hasBridgeMethodHintCompact(compact: string): boolean {
  if (compact === '') {
    return false;
  }
  const hints = [
    'ccip',
    'cctp',
    'bridge',
    'layerzero',
    'lzcompose',
    'stargate',
    'depositforburn',
    'finalizewithdraw',
    'withdrawandcall',
    'wormhole',
    'hyperlane',
    'across',
    'synapse',
    'hopbridge',
  ];
  return hints.some((s) => compact.includes(s));
}

/**
 * Whether Moralis `txType` should be **Bridge** when `isMoralisErc20FromUserWithUserNativePayment` is true.
 * Token-list omission still uses the payment predicate alone.
 */
export function shouldLabelBridgeTxTypeFromMethodCompact(compact: string): boolean {
  if (isLiquidityProvisionMethodCompact(compact)) {
    return false;
  }
  if (isSwapLikeMethodCompact(compact)) {
    return false;
  }
  if (hasBridgeMethodHintCompact(compact)) {
    return true;
  }
  return true;
}

export function shouldPromoteMoralisContractInteractionToBridgeCompact(compact: string): boolean {
  return (
    hasBridgeMethodHintCompact(compact) &&
    !isLiquidityProvisionMethodCompact(compact) &&
    !isSwapLikeMethodCompact(compact)
  );
}
