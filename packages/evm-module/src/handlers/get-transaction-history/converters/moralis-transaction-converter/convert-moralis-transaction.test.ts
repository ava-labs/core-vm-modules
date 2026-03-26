import { TokenType, TransactionType } from '@avalabs/vm-module-types';
import { convertMoralisTransaction } from './convert-moralis-transaction';
import type { MoralisTransaction } from './moralis-types';

const mockNetworkToken = {
  name: 'Ether',
  symbol: 'ETH',
  decimals: 18,
  description: 'Ether',
  logoUri: 'https://example.com/eth.png',
};

const baseTx: MoralisTransaction = {
  hash: '0xabc123',
  nonce: '5',
  from_address: '0xSender',
  to_address: '0xReceiver',
  value: '1000000000000000000',
  gas: '21000',
  gas_price: '1000000000',
  receipt_gas_used: '21000',
  receipt_status: '1',
  block_timestamp: '2025-11-14T12:00:00.000Z',
  block_number: '100',
  method_label: null,
  erc20_transfers: [],
  native_transfers: [],
  nft_transfers: [],
  summary: 'Sent 1 ETH',
  category: 'send',
};

const baseParams = {
  networkToken: mockNetworkToken,
  explorerUrl: 'https://basescan.org',
  chainId: 8453,
  address: '0xSender',
};

/** Ethereum mainnet Fusion / Markr cross-chain wrapper (checksum casing for case-insensitive match tests). */
const fusionCrossChainWrapperAddress = '0x5C32d9Dac5d16EF5E0ff634Da73934e27F1669cc';

const ethereumMainnetParams = {
  networkToken: mockNetworkToken,
  explorerUrl: 'https://etherscan.io',
  chainId: 1,
  address: '0xSender',
};

describe('convertMoralisTransaction', () => {
  it('should convert a native send transaction', () => {
    const tx: MoralisTransaction = {
      ...baseTx,
      native_transfers: [
        {
          from_address: '0xSender',
          to_address: '0xReceiver',
          value: '1000000000000000000',
          value_formatted: '1',
          direction: 'send',
          internal_transaction: false,
          token_symbol: 'ETH',
        },
      ],
    };

    const result = convertMoralisTransaction({ tx, ...baseParams });

    expect(result.hash).toBe('0xabc123');
    expect(result.from).toBe('0xSender');
    expect(result.to).toBe('0xReceiver');
    expect(result.isSender).toBe(true);
    expect(result.isOutgoing).toBe(true);
    expect(result.isIncoming).toBe(false);
    expect(result.isContractCall).toBe(false);
    expect(result.txType).toBe(TransactionType.SEND);
    expect(result.chainId).toBe('8453');
    expect(result.explorerLink).toBe('https://basescan.org/tx/0xabc123');
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0]?.type).toBe(TokenType.NATIVE);
    expect(result.tokens[0]?.symbol).toBe('ETH');
    expect(result.tokens[0]?.from?.address).toBe('0xSender');
    expect(result.tokens[0]?.to?.address).toBe('0xReceiver');
  });

  it('should convert a receive transaction', () => {
    const tx: MoralisTransaction = {
      ...baseTx,
      from_address: '0xOther',
      to_address: '0xSender',
      category: 'receive',
      native_transfers: [
        {
          from_address: '0xOther',
          to_address: '0xSender',
          value: '500000000000000000',
          value_formatted: '0.5',
          direction: 'receive',
          internal_transaction: false,
          token_symbol: 'ETH',
        },
      ],
    };

    const result = convertMoralisTransaction({ tx, ...baseParams });

    expect(result.isSender).toBe(false);
    expect(result.isIncoming).toBe(true);
    expect(result.isOutgoing).toBe(false);
    expect(result.txType).toBe(TransactionType.RECEIVE);
  });

  it('should fall back to network native symbol when Moralis native token_symbol is blank', () => {
    const tx: MoralisTransaction = {
      ...baseTx,
      from_address: '0xOther',
      to_address: '0xSender',
      category: 'receive',
      native_transfers: [
        {
          from_address: '0xOther',
          to_address: '0xSender',
          value: '1000000000000000000',
          value_formatted: '1',
          direction: 'receive',
          internal_transaction: false,
          token_symbol: '   ',
        },
      ],
    };

    const result = convertMoralisTransaction({
      tx,
      ...baseParams,
      address: '0xSender',
    });

    expect(result.tokens[0]?.symbol).toBe('ETH');
  });

  it('should convert an ERC-20 token transfer', () => {
    const tx: MoralisTransaction = {
      ...baseTx,
      category: 'token send',
      erc20_transfers: [
        {
          token_name: 'USD Coin',
          token_symbol: 'USDC',
          token_decimals: '6',
          from_address: '0xSender',
          to_address: '0xReceiver',
          address: '0xUsdcContract',
          value: '1000000',
          direction: 'send',
          value_formatted: '1',
        },
      ],
    };

    const result = convertMoralisTransaction({ tx, ...baseParams });

    expect(result.txType).toBe(TransactionType.SEND);
    expect(result.isContractCall).toBe(false);
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0]?.type).toBe(TokenType.ERC20);
    expect(result.tokens[0]?.symbol).toBe('USDC');
    expect(result.tokens[0]?.name).toBe('USD Coin');
    expect(result.tokens[0]?.decimal).toBe('6');

    const token = result.tokens[0] as { address: string };

    expect(token.address).toBe('0xUsdcContract');
    expect(result.tokens[0]?.from?.address).toBe('0xSender');
    expect(result.tokens[0]?.to?.address).toBe('0xReceiver');
  });

  it('should use token name when ERC-20 symbol is missing', () => {
    const tx: MoralisTransaction = {
      ...baseTx,
      category: 'token receive',
      erc20_transfers: [
        {
          token_name: 'Unknown Token',
          token_symbol: '',
          token_decimals: '18',
          from_address: '0xOther',
          to_address: '0xSender',
          address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          value: '1000000000000000000',
          direction: 'receive',
          value_formatted: '1',
        },
      ],
    };

    const result = convertMoralisTransaction({
      tx,
      ...baseParams,
      address: '0xSender',
    });

    expect(result.tokens[0]?.symbol).toBe('Unknown Token');
    expect(result.tokens[0]?.name).toBe('Unknown Token');
  });

  it('should shorten contract address when ERC-20 symbol and name are missing', () => {
    const tx: MoralisTransaction = {
      ...baseTx,
      category: 'token receive',
      erc20_transfers: [
        {
          token_name: '',
          token_symbol: '',
          token_decimals: '18',
          from_address: '0xOther',
          to_address: '0xSender',
          address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          value: '1000000000000000000',
          direction: 'receive',
          value_formatted: '1',
        },
      ],
    };

    const result = convertMoralisTransaction({
      tx,
      ...baseParams,
      address: '0xSender',
    });

    expect(result.tokens[0]?.symbol).toBe('0xabcd…abcd');
    expect(result.tokens[0]?.name).toBe('0xabcd…abcd');
  });

  it('should convert a swap transaction with multiple tokens', () => {
    const tx: MoralisTransaction = {
      ...baseTx,
      category: 'token swap',
      method_label: 'swap',
      erc20_transfers: [
        {
          token_name: 'USD Coin',
          token_symbol: 'USDC',
          token_decimals: '6',
          from_address: '0xSender',
          to_address: '0xRouter',
          address: '0xUsdcContract',
          value: '1000000',
          direction: 'send',
          value_formatted: '1',
        },
        {
          token_name: 'Wrapped Ether',
          token_symbol: 'WETH',
          token_decimals: '18',
          from_address: '0xRouter',
          to_address: '0xSender',
          address: '0xWethContract',
          value: '500000000000000',
          direction: 'receive',
          value_formatted: '0.0005',
        },
      ],
    };

    const result = convertMoralisTransaction({ tx, ...baseParams });

    expect(result.txType).toBe(TransactionType.SWAP);
    expect(result.isContractCall).toBe(true);
    expect(result.method).toBe('swap');
    expect(result.tokens).toHaveLength(2);
    expect(result.tokens[0]?.symbol).toBe('USDC');
    expect(result.tokens[1]?.symbol).toBe('WETH');
    expect(result.tokens[0]?.from?.address).toBe('0xSender');
    expect(result.tokens[0]?.to?.address).toBe('0xRouter');
    expect(result.tokens[1]?.from?.address).toBe('0xRouter');
    expect(result.tokens[1]?.to?.address).toBe('0xSender');
  });

  it('should convert an NFT transfer', () => {
    const tx: MoralisTransaction = {
      ...baseTx,
      category: 'nft send',
      nft_transfers: [
        {
          token_address: '0xNftContract',
          token_id: '42',
          from_address: '0xSender',
          to_address: '0xReceiver',
          contract_type: 'ERC721',
          amount: '1',
          direction: 'send',
        },
      ],
    };

    const result = convertMoralisTransaction({ tx, ...baseParams });

    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0]?.type).toBe(TokenType.ERC721);
    expect(result.tokens[0]?.collectableTokenId).toBe('42');

    const token = result.tokens[0] as { address: string };
    expect(token.address).toBe('0xNftContract');
    expect(result.tokens[0]?.from?.address).toBe('0xSender');
    expect(result.tokens[0]?.to?.address).toBe('0xReceiver');
  });

  it('should handle ERC1155 NFT transfers', () => {
    const tx: MoralisTransaction = {
      ...baseTx,
      category: 'nft send',
      nft_transfers: [
        {
          token_address: '0xNftContract',
          token_id: '7',
          from_address: '0xSender',
          to_address: '0xReceiver',
          contract_type: 'ERC1155',
          amount: '3',
          direction: 'send',
        },
      ],
    };

    const result = convertMoralisTransaction({ tx, ...baseParams });

    expect(result.tokens[0]?.type).toBe(TokenType.ERC1155);
    expect(result.tokens[0]?.amount).toBe('3');
  });

  it('should use fallback native token when there are no transfers', () => {
    const tx: MoralisTransaction = {
      ...baseTx,
      category: 'contract interaction',
      value: '500000000000000000',
    };

    const result = convertMoralisTransaction({ tx, ...baseParams });

    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0]?.type).toBe(TokenType.NATIVE);
    expect(result.tokens[0]?.symbol).toBe('ETH');
    expect(result.tokens[0]?.from?.address).toBe('0xSender');
    expect(result.tokens[0]?.to?.address).toBe('0xReceiver');
  });

  it('should handle null to_address', () => {
    const tx: MoralisTransaction = {
      ...baseTx,
      to_address: null,
      category: 'contract interaction',
    };

    const result = convertMoralisTransaction({ tx, ...baseParams });

    expect(result.to).toBe('');
  });

  it('should parse block_timestamp correctly', () => {
    const tx: MoralisTransaction = {
      ...baseTx,
      block_timestamp: '2025-11-14T12:00:00.000Z',
    };

    const result = convertMoralisTransaction({ tx, ...baseParams });

    expect(result.timestamp).toBe(new Date('2025-11-14T12:00:00.000Z').getTime());
  });

  it('should map airdrop category correctly', () => {
    const tx: MoralisTransaction = { ...baseTx, category: 'airdrop' };
    const result = convertMoralisTransaction({ tx, ...baseParams });
    expect(result.txType).toBe(TransactionType.AIRDROP);
  });

  it('should map contract interaction to UNKNOWN', () => {
    const tx: MoralisTransaction = { ...baseTx, category: 'contract interaction' };
    const result = convertMoralisTransaction({ tx, ...baseParams });
    expect(result.txType).toBe(TransactionType.UNKNOWN);
  });

  it('should map nft purchase to NFT_BUY', () => {
    const tx: MoralisTransaction = { ...baseTx, category: 'nft purchase' };
    const result = convertMoralisTransaction({ tx, ...baseParams });
    expect(result.txType).toBe(TransactionType.NFT_BUY);
  });

  it('should map token swap to SWAP', () => {
    const tx: MoralisTransaction = { ...baseTx, category: 'token swap' };
    const result = convertMoralisTransaction({ tx, ...baseParams });
    expect(result.txType).toBe(TransactionType.SWAP);
  });

  it('should classify outgoing Fusion cross-chain wrapper txs as contract call (token send + native + ERC-20)', () => {
    const tx: MoralisTransaction = {
      ...baseTx,
      to_address: fusionCrossChainWrapperAddress,
      category: 'token send',
      native_transfers: [
        {
          from_address: '0xSender',
          to_address: fusionCrossChainWrapperAddress,
          value: '239000000000000',
          value_formatted: '0.000239',
          direction: 'send',
          internal_transaction: false,
          token_symbol: 'ETH',
        },
      ],
      erc20_transfers: [
        {
          token_name: 'USD Coin',
          token_symbol: 'USDC',
          token_decimals: '6',
          from_address: '0xSender',
          to_address: fusionCrossChainWrapperAddress,
          address: '0xUsdcContract',
          value: '1000000',
          direction: 'send',
          value_formatted: '1',
        },
      ],
    };

    const result = convertMoralisTransaction({ tx, ...ethereumMainnetParams });

    expect(result.txType).toBe(TransactionType.UNKNOWN);
    expect(result.isContractCall).toBe(true);
    expect(result.tokens).toHaveLength(2);
    expect(result.tokens[0]?.symbol).toBe('USDC');
    expect(result.tokens[1]?.symbol).toBe('ETH');
  });

  it('should classify outgoing native-only sends to Fusion wrapper as contract call', () => {
    const tx: MoralisTransaction = {
      ...baseTx,
      to_address: fusionCrossChainWrapperAddress,
      category: 'send',
      native_transfers: [
        {
          from_address: '0xSender',
          to_address: fusionCrossChainWrapperAddress,
          value: '1000000000000000',
          value_formatted: '0.001',
          direction: 'send',
          internal_transaction: false,
          token_symbol: 'ETH',
        },
      ],
    };

    const result = convertMoralisTransaction({ tx, ...ethereumMainnetParams });

    expect(result.txType).toBe(TransactionType.UNKNOWN);
    expect(result.isContractCall).toBe(true);
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0]?.type).toBe(TokenType.NATIVE);
  });

  it('should not apply Fusion wrapper override on non-Ethereum chains', () => {
    const tx: MoralisTransaction = {
      ...baseTx,
      to_address: fusionCrossChainWrapperAddress,
      category: 'token send',
      erc20_transfers: [
        {
          token_name: 'USD Coin',
          token_symbol: 'USDC',
          token_decimals: '6',
          from_address: '0xSender',
          to_address: fusionCrossChainWrapperAddress,
          address: '0xUsdcContract',
          value: '1000000',
          direction: 'send',
          value_formatted: '1',
        },
      ],
    };

    const result = convertMoralisTransaction({ tx, ...baseParams });

    expect(result.txType).toBe(TransactionType.SEND);
    expect(result.isContractCall).toBe(false);
  });

  it('should not apply Fusion wrapper override when the wallet is not the sender', () => {
    const tx: MoralisTransaction = {
      ...baseTx,
      from_address: '0xOther',
      to_address: fusionCrossChainWrapperAddress,
      category: 'token send',
      erc20_transfers: [
        {
          token_name: 'USD Coin',
          token_symbol: 'USDC',
          token_decimals: '6',
          from_address: '0xOther',
          to_address: fusionCrossChainWrapperAddress,
          address: '0xUsdcContract',
          value: '1000000',
          direction: 'send',
          value_formatted: '1',
        },
      ],
    };

    const result = convertMoralisTransaction({ tx, ...ethereumMainnetParams });

    expect(result.txType).toBe(TransactionType.SEND);
    expect(result.isContractCall).toBe(false);
  });
});
