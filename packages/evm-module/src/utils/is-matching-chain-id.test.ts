import { isMatchingChainId } from './is-matching-chain-id';

describe('isMatchingChainId', () => {
  it('accepts a transaction that does not name a chain', () => {
    expect(isMatchingChainId(undefined, 43114)).toBe(true);
    expect(isMatchingChainId('', 43114)).toBe(true);
  });

  it.each([
    ['a number', 43114],
    ['a decimal string', '43114'],
    ['a hex string', '0xa86a'],
    ['an uppercase hex string', '0XA86A'],
  ])('accepts the connected chain id as %s', (_, chainId) => {
    expect(isMatchingChainId(chainId, 43114)).toBe(true);
  });

  it.each([
    ['a number', 1],
    ['a decimal string', '1'],
    ['a hex string', '0x1'],
  ])('rejects a different chain id given as %s', (_, chainId) => {
    expect(isMatchingChainId(chainId, 43114)).toBe(false);
  });

  it('rejects values that are not a chain id at all', () => {
    expect(isMatchingChainId('avalanche', 43114)).toBe(false);
    expect(isMatchingChainId('0xzz', 43114)).toBe(false);
    expect(isMatchingChainId('43114abc', 43114)).toBe(false);
  });

  it('does not confuse a hex id with the same digits read as decimal', () => {
    // 0x43114 is 274_708, not 43_114.
    expect(isMatchingChainId('0x43114', 43114)).toBe(false);
  });
});
