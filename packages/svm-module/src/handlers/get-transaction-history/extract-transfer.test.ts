import { TokenType, type Network } from '@avalabs/vm-module-types';
import { TokenUnit } from '@avalabs/core-utils-sdk';

import { extractTokenTranfers } from './extract-transfer';

describe('src/handlers/get-transaction-history/extract-transfer', () => {
  const addresses = ['address1', 'address2'];
  const accountIndex = 0;
  const network = {
    tokens: [
      { contractType: TokenType.SPL, address: 'mint1', decimals: 6, symbol: 'TOKEN1', name: 'Token 1' },
      { contractType: TokenType.SPL, address: 'mint2', decimals: 6, symbol: 'TOKEN2', name: 'Token 2' },
      {
        contractType: TokenType.SPL,
        address: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
        decimals: 6,
        symbol: 'ORCA',
        name: 'ORCA',
      },
      {
        contractType: TokenType.SPL,
        address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
        decimals: 6,
        symbol: 'JUP',
        name: 'JUP',
      },
    ],
    networkToken: { name: 'SOL', symbol: 'SOL', decimals: 9 },
  } as Network;

  it('should extract token transfers correctly', () => {
    const meta = {
      paidFee: 0,
      preBalances: [1000, 2000],
      postBalances: [900, 2100],
      preTokenBalances: [
        { mint: 'mint1', owner: 'address1', amount: 1000n, decimals: 6 },
        { mint: 'mint1', owner: 'address2', amount: 2000n, decimals: 6 },
      ],
      postTokenBalances: [
        { mint: 'mint1', owner: 'address1', amount: 1500n, decimals: 6 },
        { mint: 'mint1', owner: 'address2', amount: 1500n, decimals: 6 },
      ],
    };

    const result = extractTokenTranfers(addresses, accountIndex, meta, network);

    expect(result).toEqual([
      {
        type: TokenType.SPL,
        address: 'mint1',
        contractType: TokenType.SPL,
        decimals: 6,
        symbol: 'TOKEN1',
        name: 'Token 1',
        from: expect.objectContaining({ address: 'address2' }),
        to: expect.objectContaining({ address: 'address1' }),
        amount: new TokenUnit(500n, 6, '').toDisplay(),
      },
      {
        amount: new TokenUnit(100n, 9, '').toDisplay(),
        from: expect.objectContaining({
          address: 'address1',
        }),
        name: 'SOL',
        symbol: 'SOL',
        to: expect.objectContaining({
          address: 'address2',
        }),
        type: TokenType.NATIVE,
      },
    ]);
  });

  it('should return an empty array if no transfers are found', () => {
    const meta = {
      paidFee: 0,
      preBalances: [1000, 2000],
      postBalances: [1000, 2000],
      preTokenBalances: [
        { mint: 'mint1', owner: 'address1', amount: 1000n, decimals: 6 },
        { mint: 'mint2', owner: 'address2', amount: 2000n, decimals: 6 },
      ],
      postTokenBalances: [
        { mint: 'mint1', owner: 'address1', amount: 1000n, decimals: 6 },
        { mint: 'mint2', owner: 'address2', amount: 2000n, decimals: 6 },
      ],
    };

    const result = extractTokenTranfers(addresses, accountIndex, meta, network);

    expect(result).toEqual([]);
  });

  describe('SOL → SPL Swap Detection', () => {
    const userAddress = 'A8PsKy2JL5sA2JcTHUV1n81HHCxrFUbAXb1uBZ6XZTYT';
    const programAddress = '9FQ9gDtS6uNr5SMPafuzkDit2rMftHfQuz5mg2X3TqHT';
    const swapAddresses = [userAddress, programAddress, 'other1', 'other2'];

    it('should correctly detect SOL → SPL swap with accountIndex=0', () => {
      const meta = {
        paidFee: 5000, // 0.005 SOL
        preBalances: [1000000000, 500000000, 200000000, 100000000], // 1 SOL, 0.5 SOL, 0.2 SOL, 0.1 SOL
        postBalances: [995000000, 505000000, 200000000, 100000000], // User spent 0.005 SOL, program gained 0.005 SOL
        preTokenBalances: [
          { mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', owner: programAddress, amount: 1000000n, decimals: 6 },
        ],
        postTokenBalances: [
          { mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', owner: userAddress, amount: 457600n, decimals: 6 },
          { mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', owner: programAddress, amount: 542400n, decimals: 6 },
        ],
      };

      const result = extractTokenTranfers(swapAddresses, 0, meta, network);

      // Should have both SPL token receive and SOL send
      expect(result).toHaveLength(2);

      // SPL token transfer (receive ORCA)
      const splTransfer = result.find((t) => t.type === TokenType.SPL);
      expect(splTransfer).toBeDefined();
      expect(splTransfer?.symbol).toBe('ORCA');
      expect(splTransfer?.from?.address).toBe(programAddress);
      expect(splTransfer?.to?.address).toBe(userAddress);

      // SOL transfer (outgoing - user spent SOL)
      const solTransfer = result.find((t) => t.type === TokenType.NATIVE);
      expect(solTransfer).toBeDefined();
      expect(solTransfer?.from?.address).toBe(userAddress);
      expect(solTransfer?.to?.address).toBe(programAddress);
      expect(solTransfer?.symbol).toBe('SOL');
    });

    it('should handle counterpartyIndex out of bounds gracefully', () => {
      const meta = {
        paidFee: 5000,
        preBalances: [1000000000, 500000000], // Only 2 addresses
        postBalances: [995000000, 500000000], // User spent SOL, but no one else gained significantly
        preTokenBalances: [],
        postTokenBalances: [
          { mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', owner: userAddress, amount: 100000n, decimals: 6 },
        ],
      };

      const limitedAddresses = [userAddress, 'other1']; // Only 2 addresses
      const result = extractTokenTranfers(limitedAddresses, 0, meta, network);

      // Should create at least the SOL transfer with fallback address resolution
      expect(result.length).toBeGreaterThanOrEqual(1);

      // SOL transfer should use fallback address resolution
      const solTransfer = result.find((t) => t.type === TokenType.NATIVE);
      expect(solTransfer?.from?.address).toBe(userAddress);
      expect(solTransfer?.to?.address).toBeTruthy(); // Should have some valid address
    });

    it('should not interfere with regular SPL → SOL swaps', () => {
      const meta = {
        paidFee: 5000,
        preBalances: [995000000, 505000000], // User gained SOL, program lost SOL
        postBalances: [1000000000, 500000000],
        preTokenBalances: [
          { mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', owner: userAddress, amount: 100000n, decimals: 6 },
        ],
        postTokenBalances: [
          { mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', owner: programAddress, amount: 100000n, decimals: 6 },
        ],
      };

      const result = extractTokenTranfers(swapAddresses, 0, meta, network);

      // Should have at least the SOL transfer
      expect(result.length).toBeGreaterThanOrEqual(1);

      // SOL transfer should be incoming (user received SOL)
      const solTransfer = result.find((t) => t.type === TokenType.NATIVE);
      expect(solTransfer).toBeDefined();
      expect(solTransfer?.to?.address).toBe(userAddress);
    });

    it('should prevent isIncoming override for SOL → SPL swaps', () => {
      const meta = {
        paidFee: 5000,
        preBalances: [1000000000, 500000000, 200000000, 100000000],
        postBalances: [995000000, 515000000, 200000000, 100000000], // Program gained 15000 lamports (more than 2x fee)
        preTokenBalances: [
          { mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', owner: programAddress, amount: 1000000n, decimals: 6 },
        ],
        postTokenBalances: [
          { mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', owner: userAddress, amount: 457600n, decimals: 6 },
          { mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', owner: programAddress, amount: 542400n, decimals: 6 },
        ],
      };

      const result = extractTokenTranfers(swapAddresses, 0, meta, network);

      // Should have both transfers
      expect(result).toHaveLength(2);

      // SOL transfer should still be outgoing despite the large gain by program
      // This tests that our isSOLtoSPLSwap flag prevents the override
      const solTransfer = result.find((t) => t.type === TokenType.NATIVE);
      expect(solTransfer?.from?.address).toBe(userAddress);
      expect(solTransfer?.to?.address).toBe(programAddress);
    });
  });
});
