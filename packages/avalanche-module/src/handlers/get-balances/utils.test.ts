import { isPchainBalance, isXchainBalance, calculateAvaxTotalBalance } from './utils';
import type { PChainBalance, XChainBalances } from '@avalabs/glacier-sdk';

// Mock PChainBalance data
const mockPChainBalance = {
  unlockedUnstaked: [
    { amount: 1000000000, assetId: 'avax-asset-id' } as unknown,
    { amount: 500000000, assetId: 'other-asset-id' } as unknown,
  ],
  unlockedStaked: [{ amount: 2000000000, assetId: 'avax-asset-id' } as unknown],
  pendingStaked: [{ amount: 3000000000, assetId: 'avax-asset-id' } as unknown],
  lockedStaked: [{ amount: 4000000000, assetId: 'avax-asset-id' } as unknown],
  lockedStakeable: [{ amount: 5000000000, assetId: 'avax-asset-id' } as unknown],
  lockedPlatform: [{ amount: 6000000000, assetId: 'avax-asset-id' } as unknown],
  atomicMemoryLocked: [{ amount: 7000000000, assetId: 'avax-asset-id' } as unknown],
  atomicMemoryUnlocked: [{ amount: 8000000000, assetId: 'avax-asset-id' } as unknown],
} as PChainBalance;

// Mock XChainBalances data
const mockXChainBalance = {
  unlocked: [
    { amount: 1000000000, assetId: 'avax-asset-id' } as unknown,
    { amount: 500000000, assetId: 'other-asset-id' } as unknown,
  ],
  locked: [{ amount: 2000000000, assetId: 'avax-asset-id' } as unknown],
  atomicMemoryUnlocked: [{ amount: 3000000000, assetId: 'avax-asset-id' } as unknown],
  atomicMemoryLocked: [{ amount: 4000000000, assetId: 'avax-asset-id' } as unknown],
} as XChainBalances;

describe('isPchainBalance', () => {
  it('should return true for PChainBalance objects', () => {
    expect(isPchainBalance(mockPChainBalance)).toBe(true);
  });

  it('should return false for XChainBalances objects', () => {
    expect(isPchainBalance(mockXChainBalance)).toBe(false);
  });

  it('should return true when object has unlockedUnstaked property', () => {
    const balanceWithUnlockedUnstaked = {
      unlockedUnstaked: [],
      someOtherProp: [],
    } as unknown as PChainBalance;

    expect(isPchainBalance(balanceWithUnlockedUnstaked)).toBe(true);
  });

  it('should return false when object does not have unlockedUnstaked property', () => {
    const balanceWithoutUnlockedUnstaked = {
      locked: [],
      unlocked: [],
    } as unknown as PChainBalance;

    expect(isPchainBalance(balanceWithoutUnlockedUnstaked)).toBe(false);
  });

  it('should return false for empty objects', () => {
    const emptyObject = {} as PChainBalance;
    expect(isPchainBalance(emptyObject)).toBe(false);
  });
});

describe('isXchainBalance', () => {
  it('should return true for XChainBalances objects', () => {
    expect(isXchainBalance(mockXChainBalance)).toBe(true);
  });

  it('should return false for PChainBalance objects', () => {
    expect(isXchainBalance(mockPChainBalance)).toBe(false);
  });

  it('should return true when object has locked property', () => {
    const balanceWithLocked = {
      locked: [],
      someOtherProp: [],
    } as unknown as XChainBalances;

    expect(isXchainBalance(balanceWithLocked)).toBe(true);
  });

  it('should return false when object does not have locked property', () => {
    const balanceWithoutLocked = {
      unlocked: [],
      atomicMemoryUnlocked: [],
    } as unknown as XChainBalances;

    expect(isXchainBalance(balanceWithoutLocked)).toBe(false);
  });

  it('should return false for empty objects', () => {
    const emptyObject = {} as XChainBalances;
    expect(isXchainBalance(emptyObject)).toBe(false);
  });
});

describe('calculateAvaxTotalBalance', () => {
  const avaxAssetId = 'avax-asset-id';
  const nonAvaxAssetId = 'other-asset-id';

  describe('with PChainBalance', () => {
    it('should calculate total AVAX balance correctly', () => {
      const result = calculateAvaxTotalBalance(mockPChainBalance, avaxAssetId);

      // Expected: 1000000000 + 2000000000 + 3000000000 + 4000000000 + 5000000000 + 6000000000 + 7000000000 + 8000000000 = 36000000000
      expect(result).toBe(BigInt(36000000000));
    });

    it('should exclude non-AVAX assets from calculation', () => {
      const balanceWithMixedAssets = {
        unlockedUnstaked: [
          { amount: 1000000000, assetId: avaxAssetId } as unknown,
          { amount: 500000000, assetId: nonAvaxAssetId } as unknown, // This should be excluded
        ],
        unlockedStaked: [{ amount: 2000000000, assetId: avaxAssetId } as unknown],
      } as PChainBalance;

      const result = calculateAvaxTotalBalance(balanceWithMixedAssets, avaxAssetId);

      // Expected: 1000000000 + 2000000000 = 3000000000 (excluding the non-AVAX asset)
      expect(result).toBe(BigInt(3000000000));
    });

    it('should return 0 for empty balance arrays', () => {
      const emptyBalance = {
        unlockedUnstaked: [],
        unlockedStaked: [],
        pendingStaked: [],
        lockedStaked: [],
        lockedStakeable: [],
        lockedPlatform: [],
        atomicMemoryLocked: [],
        atomicMemoryUnlocked: [],
      } as PChainBalance;

      const result = calculateAvaxTotalBalance(emptyBalance, avaxAssetId);
      expect(result).toBe(BigInt(0));
    });
  });

  describe('with XChainBalances', () => {
    it('should calculate total AVAX balance correctly', () => {
      const result = calculateAvaxTotalBalance(mockXChainBalance, avaxAssetId);

      // Expected: 1000000000 + 2000000000 + 3000000000 + 4000000000 = 10000000000
      expect(result).toBe(BigInt(10000000000));
    });

    it('should exclude non-AVAX assets from calculation', () => {
      const balanceWithMixedAssets = {
        unlocked: [
          { amount: 1000000000, assetId: avaxAssetId } as unknown,
          { amount: 500000000, assetId: nonAvaxAssetId } as unknown, // This should be excluded
        ],
        locked: [{ amount: 2000000000, assetId: avaxAssetId } as unknown],
      } as XChainBalances;

      const result = calculateAvaxTotalBalance(balanceWithMixedAssets, avaxAssetId);

      // Expected: 1000000000 + 2000000000 = 3000000000 (excluding the non-AVAX asset)
      expect(result).toBe(BigInt(3000000000));
    });

    it('should return 0 for empty balance arrays', () => {
      const emptyBalance = {
        unlocked: [],
        locked: [],
        atomicMemoryUnlocked: [],
        atomicMemoryLocked: [],
      } as XChainBalances;

      const result = calculateAvaxTotalBalance(emptyBalance, avaxAssetId);
      expect(result).toBe(BigInt(0));
    });
  });

  describe('edge cases', () => {
    it('should handle zero amounts correctly', () => {
      const balanceWithZeros = {
        unlockedUnstaked: [
          { amount: 0, assetId: avaxAssetId } as unknown,
          { amount: 1000000000, assetId: avaxAssetId } as unknown,
        ],
      } as PChainBalance;

      const result = calculateAvaxTotalBalance(balanceWithZeros, avaxAssetId);
      expect(result).toBe(BigInt(1000000000));
    });

    it('should handle string amounts correctly', () => {
      const balanceWithStringAmounts = {
        unlockedUnstaked: [
          { amount: '1000000000', assetId: avaxAssetId } as unknown,
          { amount: '2000000000', assetId: avaxAssetId } as unknown,
        ],
      } as unknown as PChainBalance;

      const result = calculateAvaxTotalBalance(balanceWithStringAmounts, avaxAssetId);
      expect(result).toBe(BigInt(3000000000));
    });

    it('should return 0 when no matching asset ID is found', () => {
      const balanceWithDifferentAssets = {
        unlockedUnstaked: [
          { amount: 1000000000, assetId: 'some-other-asset' } as unknown,
          { amount: 2000000000, assetId: 'another-asset' } as unknown,
        ],
      } as PChainBalance;

      const result = calculateAvaxTotalBalance(balanceWithDifferentAssets, avaxAssetId);
      expect(result).toBe(BigInt(0));
    });

    it('should handle large amounts correctly', () => {
      const balanceWithLargeAmounts = {
        unlockedUnstaked: [{ amount: Number.MAX_SAFE_INTEGER, assetId: avaxAssetId } as unknown],
      } as PChainBalance;

      const result = calculateAvaxTotalBalance(balanceWithLargeAmounts, avaxAssetId);
      expect(result).toBe(BigInt(Number.MAX_SAFE_INTEGER));
    });
  });
});
