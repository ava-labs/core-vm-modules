import {
  encodeHypercoreFillMethod,
  parseHypercoreFillMethod,
  tickerOfCoin,
  closedPnlTone,
} from './hypercore-fill-meta';

describe('hypercoreFillMeta', () => {
  it('strips HIP-3 dex prefixes from coin tickers', () => {
    expect(tickerOfCoin('xyz:GOLD')).toBe('GOLD');
    expect(tickerOfCoin('ETH')).toBe('ETH');
  });

  it('derives PnL tone from closedPnl', () => {
    expect(closedPnlTone('1.5')).toBe('profit');
    expect(closedPnlTone('-2')).toBe('loss');
    expect(closedPnlTone('0')).toBeUndefined();
  });

  it('round-trips fill method encoding', () => {
    const meta = { dir: 'Open Long', px: '100', closedPnl: '0', coin: 'ETH' };
    const encoded = encodeHypercoreFillMethod(meta);
    expect(encoded.startsWith('hypercoreFill:v1:')).toBe(true);
    expect(parseHypercoreFillMethod(encoded)).toEqual(meta);
    expect(parseHypercoreFillMethod('other')).toBeUndefined();
  });
});
