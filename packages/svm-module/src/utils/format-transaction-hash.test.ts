import { toHexTxHash, toBase58TxHash } from './format-transaction-hash';

interface TestCases {
  base58: string;
  hex: `0x${string}`;
}

describe('format-transaction-hash', () => {
  const testCases: TestCases[] = [
    {
      base58: '5KKsT9B7J3v3N6TKwHnb6THwo8E2Xe7t',
      hex: '0xd0f608d667c54f5dae47e002c8255e777a078f333d9363',
    },
    {
      base58: '4EPwNRmBrKQqYHKMP4G4rvBWx5rXaJgHop8HJvxrPJMPYwPuWd4GZgKUNS1P4G6qDpHxYKomQGviDtjnksVqHgK5',
      hex: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    },
  ];

  describe('toHexTxHash', () => {
    it.each(testCases)('converts base58 hash to hex: $base58', ({ base58, hex }) => {
      expect(toHexTxHash(base58)).toBe(hex);
    });
  });

  describe('toBase58TxHash', () => {
    it.each(testCases)('converts hex hash to base58: $hex', ({ base58, hex }) => {
      expect(toBase58TxHash(hex)).toBe(base58);
    });
  });

  it('maintains consistency when converting back and forth', () => {
    const originalBase58 = '5KKsT9B7J3v3N6TKwHnb6THwo8E2Xe7t';
    const hex = toHexTxHash(originalBase58);
    const base58 = toBase58TxHash(hex);
    expect(base58).toBe(originalBase58);
  });
});
