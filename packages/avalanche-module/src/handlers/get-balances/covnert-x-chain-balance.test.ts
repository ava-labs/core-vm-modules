// Mock data
import { convertXChainBalance } from './covnert-x-chain-balance';
import type { XChainBalances } from '@avalabs/glacier-sdk';
import type { NetworkToken } from '@avalabs/vm-module-types';

const mockBalance = {
  unlocked: [
    { amount: 150_000_000_000, assetId: 'avaxAssetId' } as unknown,
    { amount: 150_000_000_000, assetId: 'nonAvaxAssetId' } as unknown,
  ],
  locked: [{ amount: 250_000_000_000, assetId: 'avaxAssetId' } as unknown],
  atomicMemoryUnlocked: [{ amount: 350_000_000_000, assetId: 'avaxAssetId' } as unknown],
  atomicMemoryLocked: [{ amount: 450_000_000_000, assetId: 'avaxAssetId' } as unknown],
} as XChainBalances;

const mockNetworkToken = {
  decimals: 9,
  symbol: 'AVAX',
} as NetworkToken;

describe('convertXChainBalance', () => {
  it('should convert balance correctly with all fields', () => {
    const priceInCurrency = 5;
    const marketCap = 2000000;
    const vol24 = 100000;
    const change24 = 2;
    const coingeckoId = 'test-token-x';

    const result = convertXChainBalance({
      balance: mockBalance,
      networkToken: mockNetworkToken,
      priceInCurrency,
      marketCap,
      vol24,
      change24,
      coingeckoId,
      avaxAssetId: 'avaxAssetId',
    });

    expect(result.priceInCurrency).toBe(priceInCurrency);
    expect(result.marketCap).toBe(marketCap);
    expect(result.vol24).toBe(vol24);
    expect(result.change24).toBe(change24);
    expect(result.coingeckoId).toBe(coingeckoId);
  });

  it('should handle missing optional fields gracefully', () => {
    const result = convertXChainBalance({
      balance: mockBalance,
      networkToken: mockNetworkToken,
      coingeckoId: 'test-token-x',
      avaxAssetId: 'avaxAssetId',
    });

    expect(result.priceInCurrency).toBeUndefined();
    expect(result.marketCap).toBeUndefined();
    expect(result.vol24).toBeUndefined();
    expect(result.change24).toBeUndefined();
  });

  it('should calculate balance per type correctly', () => {
    const result = convertXChainBalance({
      balance: mockBalance,
      networkToken: mockNetworkToken,
      coingeckoId: 'test-token-x',
      avaxAssetId: 'avaxAssetId',
    });

    expect(result.balancePerType.unlocked).toBe(BigInt(150 * 10 ** 9));
    expect(result.balancePerType.locked).toBe(BigInt(250 * 10 ** 9));
    expect(result.balancePerType.atomicMemoryUnlocked).toBe(BigInt(350 * 10 ** 9));
    expect(result.balancePerType.atomicMemoryLocked).toBe(BigInt(450 * 10 ** 9));
  });

  it('should return zero for empty balance types', () => {
    const emptyBalance = {
      unlocked: [],
      locked: [],
      atomicMemoryUnlocked: [],
      atomicMemoryLocked: [],
    };

    const result = convertXChainBalance({
      balance: emptyBalance,
      networkToken: mockNetworkToken,
      coingeckoId: 'test-token-x',
      avaxAssetId: 'avaxAssetId',
    });

    expect(result.balancePerType.unlocked).toBe(0n);
    expect(result.balancePerType.locked).toBe(0n);
    expect(result.balancePerType.atomicMemoryUnlocked).toBe(0n);
    expect(result.balancePerType.atomicMemoryLocked).toBe(0n);
  });
});
