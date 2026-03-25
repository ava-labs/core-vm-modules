import {
  hasBridgeMethodHintCompact,
  isLiquidityProvisionMethodCompact,
  isSwapLikeMethodCompact,
  shouldLabelBridgeTxTypeFromMethodCompact,
} from './moralis-method-flags';

describe('moralis-method-flags', () => {
  it('detects swap-like methods', () => {
    expect(isSwapLikeMethodCompact('exactinputsingle')).toBe(true);
    expect(isSwapLikeMethodCompact('unoswap')).toBe(true);
    expect(isSwapLikeMethodCompact('ccipsend')).toBe(false);
  });

  it('detects liquidity methods', () => {
    expect(isLiquidityProvisionMethodCompact('addliquidityeth')).toBe(true);
    expect(isLiquidityProvisionMethodCompact('removeliquidity')).toBe(true);
    expect(isLiquidityProvisionMethodCompact('ccipsend')).toBe(false);
  });

  it('detects bridge hints', () => {
    expect(hasBridgeMethodHintCompact('ccipsend')).toBe(true);
    expect(hasBridgeMethodHintCompact('depositforburn')).toBe(true);
    expect(hasBridgeMethodHintCompact('exactinput')).toBe(false);
  });

  it('shouldLabelBridgeTxTypeFromMethodCompact rejects LP and swap, accepts unknown and bridge hints', () => {
    expect(shouldLabelBridgeTxTypeFromMethodCompact('addliquidityeth')).toBe(false);
    expect(shouldLabelBridgeTxTypeFromMethodCompact('exactinput')).toBe(false);
    expect(shouldLabelBridgeTxTypeFromMethodCompact('ccipsend')).toBe(true);
    expect(shouldLabelBridgeTxTypeFromMethodCompact('')).toBe(true);
  });
});
