import { getExplorerApiUrl } from './explorer-api-urls';

describe('getExplorerApiUrl', () => {
  it('should return Basescan API URL for Base (8453)', () => {
    expect(getExplorerApiUrl(8453)).toBe('https://api.basescan.org');
  });

  it('should return Arbiscan API URL for Arbitrum (42161)', () => {
    expect(getExplorerApiUrl(42161)).toBe('https://api.arbiscan.io');
  });

  it('should return Optimistic Etherscan API URL for Optimism (10)', () => {
    expect(getExplorerApiUrl(10)).toBe('https://api-optimistic.etherscan.io');
  });

  it('should return undefined for unsupported chains', () => {
    expect(getExplorerApiUrl(43114)).toBeUndefined();
    expect(getExplorerApiUrl(1)).toBeUndefined();
  });
});
