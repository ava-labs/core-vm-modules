import { TokenType, TransactionType, type TxToken } from '@avalabs/vm-module-types';
import { convertTransactionType } from './get-tx-type';

const wallet = '0xUser';

function buildErc721ToUser(): TxToken {
  return {
    name: 'N',
    symbol: 'N',
    amount: '1',
    type: TokenType.ERC721,
    address: '0xnft',
    collectableTokenId: '1',
    from: { address: '0xOther' },
    to: { address: wallet },
  };
}

function buildErc721FromUser(): TxToken {
  return {
    name: 'N',
    symbol: 'N',
    amount: '1',
    type: TokenType.ERC721,
    address: '0xnft',
    collectableTokenId: '1',
    from: { address: wallet },
    to: { address: '0xOther' },
  };
}

describe('convertTransactionType', () => {
  it('promotes RECEIVE to NFT_RECEIVE when user receives an NFT after fungible tokens', () => {
    const fungible: TxToken = {
      name: 'T',
      symbol: 'TKN',
      amount: '1',
      type: TokenType.ERC20,
      address: '0xerc20',
      from: { address: '0xOther' },
      to: { address: wallet },
    };
    const result = convertTransactionType({
      txType: TransactionType.RECEIVE,
      isSender: false,
      walletAddress: wallet,
      tokens: [fungible, buildErc721ToUser()],
    });
    expect(result).toBe(TransactionType.NFT_RECEIVE);
  });

  it('promotes SEND to NFT_SEND when user sends an NFT after native', () => {
    const native: TxToken = {
      name: 'ETH',
      symbol: 'ETH',
      amount: '0.001',
      type: TokenType.NATIVE,
      from: { address: wallet },
      to: { address: '0xOther' },
    };
    const result = convertTransactionType({
      txType: TransactionType.SEND,
      isSender: true,
      walletAddress: wallet,
      tokens: [native, buildErc721FromUser()],
    });
    expect(result).toBe(TransactionType.NFT_SEND);
  });

  it('leaves SWAP unchanged when tokens include an NFT', () => {
    const result = convertTransactionType({
      txType: TransactionType.SWAP,
      isSender: true,
      walletAddress: wallet,
      tokens: [buildErc721FromUser()],
    });
    expect(result).toBe(TransactionType.SWAP);
  });

  it('leaves RECEIVE unchanged when wallet is tx sender but only receives an NFT', () => {
    const result = convertTransactionType({
      txType: TransactionType.RECEIVE,
      isSender: true,
      walletAddress: wallet,
      tokens: [buildErc721ToUser()],
    });
    expect(result).toBe(TransactionType.RECEIVE);
  });

  it('promotes AIRDROP to NFT_RECEIVE when Moralis lists fungible before an NFT leg to the wallet', () => {
    const fungible: TxToken = {
      name: 'Spam',
      symbol: 'SPAM',
      amount: '1',
      type: TokenType.ERC20,
      address: '0xspam',
      from: { address: '0xOther' },
      to: { address: wallet },
    };
    const result = convertTransactionType({
      txType: TransactionType.AIRDROP,
      isSender: false,
      walletAddress: wallet,
      tokens: [fungible, buildErc721ToUser()],
    });
    expect(result).toBe(TransactionType.NFT_RECEIVE);
  });

  it('leaves AIRDROP unchanged when there is no NFT to the wallet', () => {
    const fungible: TxToken = {
      name: 'T',
      symbol: 'TKN',
      amount: '1',
      type: TokenType.ERC20,
      address: '0xerc20',
      from: { address: '0xOther' },
      to: { address: wallet },
    };
    const result = convertTransactionType({
      txType: TransactionType.AIRDROP,
      isSender: false,
      walletAddress: wallet,
      tokens: [fungible],
    });
    expect(result).toBe(TransactionType.AIRDROP);
  });
});
