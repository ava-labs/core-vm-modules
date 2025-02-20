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
});
