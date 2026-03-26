import { TokenType, TransactionType, type TxToken } from '@avalabs/vm-module-types';
import { orderActivityTokensForWallet } from './order-activity-tokens-for-wallet';

describe('orderActivityTokensForWallet', () => {
  const wallet = '0xAbCdEf0000000000000000000000000000000001';

  it('returns original order when not SWAP', () => {
    const tokens: TxToken[] = [
      {
        type: TokenType.ERC20,
        symbol: 'B',
        name: 'B',
        decimal: '18',
        amount: '1',
        address: '0xb',
        from: { address: wallet },
        to: { address: '0xpool' },
      },
    ];
    expect(orderActivityTokensForWallet(tokens, TransactionType.SEND, wallet)).toBe(tokens);
  });

  it('puts outgoing then incoming fungible legs first for SWAP', () => {
    const incoming: TxToken = {
      type: TokenType.ERC20,
      symbol: 'USDC',
      name: 'USDC',
      decimal: '6',
      amount: '100',
      address: '0xusdc',
      from: { address: '0xpool' },
      to: { address: wallet },
    };
    const outgoing: TxToken = {
      type: TokenType.NATIVE,
      symbol: 'ETH',
      name: 'Ether',
      decimal: '18',
      amount: '0.1',
      from: { address: wallet },
      to: { address: '0xpool' },
    };
    const tokens: TxToken[] = [incoming, outgoing];

    const ordered = orderActivityTokensForWallet(tokens, TransactionType.SWAP, wallet);
    expect(ordered[0]).toBe(outgoing);
    expect(ordered[1]).toBe(incoming);
  });

  it('returns original order when legs cannot be matched', () => {
    const tokens: TxToken[] = [
      {
        type: TokenType.ERC20,
        symbol: 'X',
        name: 'X',
        decimal: '18',
        amount: '1',
        address: '0xx',
        from: { address: '0xother' },
        to: { address: '0xpool' },
      },
    ];
    expect(orderActivityTokensForWallet(tokens, TransactionType.SWAP, wallet)).toBe(tokens);
  });
});
