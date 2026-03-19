import { isMoralisSupportedChain } from './moralis-chain-ids';

describe('isMoralisSupportedChain', () => {
  it.each([
    [8453, true],
    [42161, true],
    [10, true],
  ])('should return true for chain ID %d', (chainId, expected) => {
    expect(isMoralisSupportedChain(chainId)).toBe(expected);
  });

  it.each([[1], [5], [11155111], [43114], [137], [56]])('should return false for chain ID %d', (chainId) => {
    expect(isMoralisSupportedChain(chainId)).toBe(false);
  });
});
