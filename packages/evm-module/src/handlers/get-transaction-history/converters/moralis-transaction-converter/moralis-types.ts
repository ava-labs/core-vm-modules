export interface MoralisWalletHistoryResponse {
  cursor: string | null;
  page_size: number;
  page: number;
  result: MoralisTransaction[];
}

// https://docs.moralis.com/web3-data-api/evm/reference/wallet-api/get-wallet-history
export type MoralisCategory =
  | 'send'
  | 'receive'
  | 'token send'
  | 'token receive'
  | 'nft send'
  | 'nft receive'
  | 'token swap'
  | 'deposit'
  | 'withdraw'
  | 'nft purchase'
  | 'nft sale'
  | 'airdrop'
  | 'mint'
  | 'burn'
  | 'borrow'
  | 'contract interaction';

export interface MoralisTransaction {
  hash: string;
  nonce: string;
  from_address: string;
  to_address: string | null;
  value: string;
  gas: string;
  gas_price: string;
  receipt_gas_used: string;
  receipt_status: string;
  block_timestamp: string;
  block_number: string;
  method_label: string | null;
  erc20_transfers: MoralisErc20Transfer[];
  native_transfers: MoralisNativeTransfer[];
  nft_transfers: MoralisNftTransfer[];
  summary: string;
  category: MoralisCategory;
}

export interface MoralisErc20Transfer {
  token_name: string;
  token_symbol: string;
  token_decimals: string;
  from_address: string;
  to_address: string | null;
  address: string;
  value: string;
  direction: string;
  value_formatted: string;
}

export interface MoralisNativeTransfer {
  from_address: string;
  to_address: string | null;
  value: string;
  value_formatted: string;
  direction: string;
  internal_transaction: boolean;
  token_symbol: string;
}

export interface MoralisNftTransfer {
  token_address: string;
  token_id: string;
  from_address: string;
  to_address: string | null;
  contract_type: string;
  amount: string;
  direction: string;
}
