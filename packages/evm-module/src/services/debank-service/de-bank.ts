import type { Hex } from '@avalabs/vm-module-types';

export class DeBank {
  #supportedChainIds: DeBankChainInfo[] = [];

  constructor(private baseUrl: string) {}

  async isNetworkSupported(chainId: number): Promise<boolean> {
    const chainList: DeBankChainInfo[] = await this.getChainList();
    const chainIds = chainList.map((value) => value.community_id);
    return chainIds.some((id) => id === chainId);
  }

  /**
   * @param chainId - DeBank chain id (ex. "base", "eth")
   */
  async getChainInfo({ chainId }: { chainId: string }): Promise<DeBankChainInfo | undefined> {
    const chainList = await this.getChainList();
    return chainList.find((chain) => chain.id === chainId);
  }

  /**
   * @param chainId - DeBank chain id (ex. "base", "eth")
   * @param address - account address
   * @param tokenId - The address of the token contract or a native token id (eth, matic, bsc)
   */
  async getTokenBalance({
    chainId,
    address,
    tokenId,
  }: {
    chainId: string;
    address: Hex;
    tokenId: Hex | string;
  }): Promise<DeBankToken> {
    const tokenBalanceResponse = await fetch(
      `${this.baseUrl}/v1/user/token?id=${address}&chain_id=${chainId}&token_id=${tokenId}`,
    );
    if (tokenBalanceResponse.ok) {
      return await tokenBalanceResponse.json();
    } else {
      throw new Error(`${tokenBalanceResponse.status}:${tokenBalanceResponse.statusText}`);
    }
  }

  /**
   * @param chainId - DeBank chain id (ex. "base", "eth")
   * @param address - account address
   */
  async getTokenList({ chainId, address }: { chainId: string; address: Hex }): Promise<DeBankToken[]> {
    const response = await fetch(`${this.baseUrl}/v1/user/token_list?id=${address}&chain_id=${chainId}`);
    if (response.ok) {
      return await response.json();
    } else {
      throw new Error(`${response.status}:${response.statusText}`);
    }
  }

  /**
   * @returns Cached chain list if there is any, or tries to fetch it from API
   */
  async getChainList(): Promise<DeBankChainInfo[]> {
    if (this.#supportedChainIds.length === 0) {
      const chainListResponse = await fetch(`${this.baseUrl}/v1/chain/list`);
      if (chainListResponse.ok) {
        this.#supportedChainIds = await chainListResponse.json();
      } else {
        throw new Error(`${chainListResponse.status}:${chainListResponse.statusText}`);
      }
    }
    return this.#supportedChainIds;
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
  id: Hex | string; //address or native token id (eth, matic, bsc)
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
  amount: bigint;
  raw_amount: bigint;
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
export type DeBankChainInfo = {
  id: string;
  community_id: number;
  name: string;
  native_token_id: string;
  logo_url: string;
  wrapped_token_id: Hex;
  is_support_pre_exec: boolean;
};
