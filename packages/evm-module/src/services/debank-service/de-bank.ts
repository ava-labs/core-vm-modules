import type { Hex } from '@avalabs/vm-module-types';

export const DE_BANK_SUPPORTED_CHAINS: Record<number, string> = {
  42161: 'arb',
  56: 'bsc',
  10: 'op',
  137: 'matic',
  8453: 'base',
};

export class DeBank {
  constructor(private baseUrl: string) {}

  isNetworkSupported(chainId: number): boolean {
    const chainIds = Object.keys(DE_BANK_SUPPORTED_CHAINS).map((value) => Number(value));
    return chainIds.some((id) => id === chainId);
  }

  /**
   * @param chainId - DeBank chain id (ex. "base", "eth")
   */
  async getChainInfo({ chainId }: { chainId: string }): Promise<DeBankChainInfo> {
    const chainInfoResponse = await fetch(`${this.baseUrl}/v1/chain?id=${chainId}`);
    return await chainInfoResponse.json();
  }

  /**
   * @param chainId - DeBank chain id (ex. "base", "eth")
   * @param address - account address
   * @param tokenId - DeBank token id (ex. "0x19225f002b65eefb22950b9739fc8b448d900d44")
   */
  async getTokenBalance({
    chainId,
    address,
    tokenId,
  }: {
    chainId: string;
    address: Hex;
    tokenId: Hex;
  }): Promise<DeBankToken> {
    const tokenBalanceResponse = await fetch(
      `${this.baseUrl}/v1/user/token?id=${address}&chain_id=${chainId}&token_id=${tokenId}`,
    );
    return await tokenBalanceResponse.json();
  }

  /**
   * @param chainId - DeBank chain id (ex. "base", "eth")
   * @param address - account address
   */
  async getTokenList({ chainId, address }: { chainId: string; address: Hex }): Promise<DeBankToken[]> {
    const response = await fetch(`${this.baseUrl}/v1/user/token_list?id=${address}&chain_id=${chainId}`);
    return await response.json();
  }
}
export type TokenId = Hex;
/**
 * Example:
 * ```json
 * {
 *     "id": "0x19225f002b65eefb22950b9739fc8b448d900d44",
 *     "chain": "base",
 *     "name": "BASE",
 *     "symbol": "Collect on: swap-based.com",
 *     "display_symbol": null,
 *     "optimized_symbol": "Collect on: swap-based.com",
 *     "decimals": 0,
 *     "logo_url": null,
 *     "protocol_id": "",
 *     "price": 0,
 *     "price_24h_change": null,
 *     "is_verified": false,
 *     "is_core": false,
 *     "is_wallet": false,
 *     "time_at": 1712662101,
 *     "amount": 250000,
 *     "raw_amount": 250000,
 *     "raw_amount_hex_str": "0x3d090"
 *   }
 * ```
 */
export type DeBankToken = {
  id: Hex;
  chain: string;
  name: string;
  symbol: string;
  optimized_symbol: string;
  decimals: number;
  logo_url: string;
  protocol_id: string;
  price: number;
  is_core: boolean;
  is_wallet: boolean;
  time_at: number;
  amount: number;
  raw_amount: number;
};

/**
 * Example:
 * ```json
 * {
 *   "id": "eth",
 *   "community_id": 1,
 *   "name": "Ethereum",
 *   "native_token_id": "eth",
 *   "logo_url": "https://static.debank.com/image/chain/logo_url/eth/42ba589cd077e7bdd97db6480b0ff61d.png",
 *   "wrapped_token_id": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
 *   "is_support_pre_exec": true
 * }
 * ```
 */
type DeBankChainInfo = {
  id: string;
  community_id: number;
  name: string;
  native_token_id: string;
  logo_url: string;
  wrapped_token_id: Hex;
  is_support_pre_exec: boolean;
};
