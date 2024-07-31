// Mock data
import { convertPChainBalance } from './convert-p-chain-balance';
import { type PChainBalance } from '@avalabs/glacier-sdk';
import type { NetworkToken } from '@avalabs/vm-module-types';

const mockBalance = {
  unlockedUnstaked: [{ amount: 1000000000 } as unknown],
  unlockedStaked: [{ amount: 2000000000 } as unknown],
  pendingStaked: [{ amount: 3000000000 } as unknown],
  lockedStaked: [{ amount: 4000000000 } as unknown],
  lockedStakeable: [{ amount: 5000000000 } as unknown],
  lockedPlatform: [{ amount: 6000000000 } as unknown],
  atomicMemoryLocked: [{ amount: 7000000000 } as unknown],
  atomicMemoryUnlocked: [{ amount: 8000000000 } as unknown],
} as PChainBalance;

const mockNetworkToken = {
  decimals: 9,
  symbol: 'AVAX',
} as NetworkToken;

describe('convertPChainBalance', () => {
  it('should convert balance correctly with all fields', () => {
    const priceInCurrency = 10;
    const marketCap = 1000000;
    const vol24 = 50000;
    const change24 = 5;
    const coingeckoId = 'test-token';

    const result = convertPChainBalance({
      balance: mockBalance,
      networkToken: mockNetworkToken,
      priceInCurrency,
      marketCap,
      vol24,
      change24,
      coingeckoId,
    });

    expect(result.priceInCurrency).toBe(priceInCurrency);
    expect(result.marketCap).toBe(marketCap);
    expect(result.vol24).toBe(vol24);
    expect(result.change24).toBe(change24);
    expect(result.coingeckoId).toBe(coingeckoId);
  });

  it('should handle missing optional fields gracefully', () => {
    const result = convertPChainBalance({
      balance: mockBalance,
      networkToken: mockNetworkToken,
      coingeckoId: 'test-token',
    });

    expect(result.priceInCurrency).toBeUndefined();
    expect(result.marketCap).toBeUndefined();
    expect(result.vol24).toBeUndefined();
    expect(result.change24).toBeUndefined();
  });

  it('should calculate balance per type correctly', () => {
    const result = convertPChainBalance({
      balance: mockBalance,
      networkToken: mockNetworkToken,
      coingeckoId: 'test-token',
    });

    expect(result.balancePerType.lockedStaked).toBe(4);
    expect(result.balancePerType.lockedStakeable).toBe(5);
    expect(result.balancePerType.lockedPlatform).toBe(6);
    expect(result.balancePerType.atomicMemoryLocked).toBe(7);
    expect(result.balancePerType.atomicMemoryUnlocked).toBe(8);
    expect(result.balancePerType.unlockedUnstaked).toBe(1);
    expect(result.balancePerType.unlockedStaked).toBe(2);
    expect(result.balancePerType.pendingStaked).toBe(3);
  });

  it('should return zero for empty balance types', () => {
    const emptyBalance = {
      unlockedUnstaked: [],
      unlockedStaked: [],
      pendingStaked: [],
      lockedStaked: [],
      lockedStakeable: [],
      lockedPlatform: [],
      atomicMemoryLocked: [],
      atomicMemoryUnlocked: [],
    };

    const result = convertPChainBalance({
      balance: emptyBalance,
      networkToken: mockNetworkToken,
      coingeckoId: 'test-token',
    });

    expect(result.balancePerType.lockedStaked).toBe(0);
    expect(result.balancePerType.lockedStakeable).toBe(0);
    expect(result.balancePerType.lockedPlatform).toBe(0);
    expect(result.balancePerType.atomicMemoryLocked).toBe(0);
    expect(result.balancePerType.atomicMemoryUnlocked).toBe(0);
    expect(result.balancePerType.unlockedUnstaked).toBe(0);
    expect(result.balancePerType.unlockedStaked).toBe(0);
    expect(result.balancePerType.pendingStaked).toBe(0);
  });
});
