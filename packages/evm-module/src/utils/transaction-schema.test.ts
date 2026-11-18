import { isValidEip55Address, transactionSchema } from './transaction-schema';

// Vitalik's address, EIP-55 checksummed.
const CHECKSUMMED = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const LOWERCASE = CHECKSUMMED.toLowerCase();
const UPPERCASE = `0x${CHECKSUMMED.slice(2).toUpperCase()}`;
// Same address with the case of a single letter flipped ("d8dA" -> "d8da").
const BAD_CHECKSUM = '0xd8da6BF26964aF9D7eEd9e03E53415D37aA96045';

const issuesFor = (tx: unknown) => {
  const result = transactionSchema.safeParse(tx);
  return result.success ? [] : result.error.issues;
};

describe('isValidEip55Address', () => {
  it.each([
    ['a valid checksummed address', CHECKSUMMED],
    ['an all-lowercase address', LOWERCASE],
    ['an all-uppercase address', UPPERCASE],
    ['the zero address', '0x0000000000000000000000000000000000000000'],
    ['an all-digit address', '0x1234567890123456789012345678901234567890'],
  ])('accepts %s', (_name, address) => {
    expect(isValidEip55Address(address)).toBe(true);
  });

  it.each([
    ['a mixed-case address with a wrong checksum', BAD_CHECKSUM],
    ['a non-hex address', '0xzz8dA6BF26964aF9D7eEd9e03E53415D37aA9604'],
    ['an address without the 0x prefix', `00${CHECKSUMMED.slice(2)}`],
    ['a short address', '0x123'],
  ])('rejects %s', (_name, address) => {
    expect(isValidEip55Address(address)).toBe(false);
  });
});

describe('transactionSchema address validation', () => {
  it.each([
    ['checksummed', CHECKSUMMED],
    ['all-lowercase', LOWERCASE],
    ['all-uppercase', UPPERCASE],
  ])('accepts %s "from" and "to" addresses', (_name, address) => {
    const result = transactionSchema.safeParse({ from: address, to: address });
    expect(result.success).toBe(true);
    // Addresses are passed through untouched.
    expect(result.success && result.data).toEqual({ from: address, to: address });
  });

  it('accepts a transaction without "to" (contract deployment)', () => {
    expect(transactionSchema.safeParse({ from: CHECKSUMMED, data: '0x60806040' }).success).toBe(true);
  });

  it.each(['from', 'to'] as const)('rejects a "%s" address with an invalid EIP-55 checksum', (field) => {
    const tx = { from: CHECKSUMMED, to: CHECKSUMMED, [field]: BAD_CHECKSUM };

    expect(issuesFor(tx)).toEqual([
      expect.objectContaining({ path: [field], message: `'${field}' address has an invalid EIP-55 checksum` }),
    ]);
  });

  it.each(['from', 'to'] as const)('rejects a non-hex "%s" address of the right length', (field) => {
    const tx = { from: CHECKSUMMED, to: CHECKSUMMED, [field]: `0x${'g'.repeat(40)}` };

    expect(issuesFor(tx)).toEqual([
      expect.objectContaining({ path: [field], message: `'${field}' must be a 0x-prefixed 20-byte hex address` }),
    ]);
  });
});
