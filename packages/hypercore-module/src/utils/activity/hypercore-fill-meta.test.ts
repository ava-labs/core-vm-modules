import {
  encodeHypercoreFillMethod,
  parseHypercoreFillMethod,
  tickerOfCoin,
  closedPnlTone,
  fillLabel,
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

  it('maps fill dirs to label direction', () => {
    expect(fillLabel('Close Long', '1')).toEqual({ text: 'Long closed', direction: 'up', tone: 'profit' });
    expect(fillLabel('Close Short', '-1')).toEqual({ text: 'Short closed', direction: 'down', tone: 'loss' });
    expect(fillLabel('Open Long')).toEqual({ text: 'Order opened' });
  });

  it('round-trips fill method encoding', () => {
    const meta = { dir: 'Open Long', px: '100', closedPnl: '0', coin: 'ETH' };
    const encoded = encodeHypercoreFillMethod(meta);
    expect(encoded.startsWith('hypercoreFill:v1:')).toBe(true);
    expect(parseHypercoreFillMethod(encoded)).toEqual(meta);
    expect(parseHypercoreFillMethod('other')).toBeUndefined();
  });
});
