import { getExplorerLink } from './get-explorer-link';

describe('src/handlers/get-transaction-history/get-explorer-link', () => {
  it('should keep query params intact when baseUrl is provided', () => {
    const txHash = '123abc';
    const baseUrl = 'https://explorer.solana.com?cluster=devnet';

    expect(getExplorerLink(txHash, baseUrl)).toBe(`https://explorer.solana.com/tx/${txHash}?cluster=devnet`);
  });
});
