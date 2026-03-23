import type { Hex } from '@avalabs/vm-module-types';
import { fetchAndVerify } from '@internal/utils';
import { isHexString } from 'ethers';
import { z } from 'zod';

export class DeBank {
  #supportedChainIds: DeBankChainInfo[] = [];
  #fetchFn: typeof fetch;

  constructor(
    private baseUrl: string,
    fetchFn?: typeof fetch,
  ) {
    this.#fetchFn = fetchFn ?? fetch;
  }

  async isNetworkSupported(chainId: number): Promise<boolean> {
    const chainList: DeBankChainInfo[] = await this.getChainList();
    return chainList.some((value) => value.community_id === chainId);
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
    const tokenBalanceResponse = await this.#fetchFn(
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
  async getTokensBalanceOnChain({ chainId, address }: { chainId: string; address: Hex }): Promise<DeBankToken[]> {
    const tokenBalanceResponse = await this.#fetchFn(
      `${this.baseUrl}/v1/user/token_list?id=${address}&chain_id=${chainId}`,
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
    const response = await (this.#fetchFn ?? globalThis.fetch)(
      `${this.baseUrl}/v1/user/token_list?id=${address}&chain_id=${chainId}`,
    );
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
      const chainListResponse = await this.#fetchFn(`${this.baseUrl}/v1/chain/list`);
      if (chainListResponse.ok) {
        this.#supportedChainIds = await chainListResponse.json();
      } else {
        throw new Error(`${chainListResponse.status}:${chainListResponse.statusText}`);
      }
    }
    return this.#supportedChainIds;
  }

  /**
   * @param chainId - DeBank chain id (ex. "base", "eth")
   * @param address - account address
   */
  async getNftList({ address, chainId }: { chainId: string; address: Hex }): Promise<DeBankNftToken[]> {
    return fetchAndVerify<typeof DeBankNftTokenListSchema>(
      [`${this.baseUrl}/v1/user/nft_list?id=${address}&chain_id=${chainId}`],
      DeBankNftTokenListSchema,
      this.#fetchFn,
    );
  }
}

const BaseDeBankTokenSchema = z.object({
  id: z.union([z.custom<string>(isHexString), z.string()]), //address or native token id (eth, matic, bsc)
  chain: z.string(),
  name: z.string(),
});

type BaseDeBankToken = z.infer<typeof BaseDeBankTokenSchema>;

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

// TODO: create zod schema
export type DeBankToken = BaseDeBankToken & {
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
// TODO: create zod schema
export type DeBankChainInfo = {
  id: string;
  community_id: number;
  name: string;
  native_token_id: string;
  logo_url: string;
  wrapped_token_id: Hex;
  is_support_pre_exec: boolean;
};

/**
 * Example:
 * ```json
 * {
 *     "id": "defc948fbe6d3b138b49bf981e276f0b",
 *     "contract_id": "0x495f947276749ce646f68ac8c248420045cb7b5e",
 *     "inner_id": "55575360221028374465659771733000318579577403829328624053715758637886677712897",
 *     "chain": "eth",
 *     "name": "A New Era has begun",
 *     "description": "3 of 9\n\nOn February 8, 2021, one of the most influential men in the world decided to invest in Bitcoin. Elon Musk, owner of Tesl",
 *     "content_type": "image_url",
 *     "content": "https://lh3.googleusercontent.com/WQnK8JxSSPj5YIxegh9iaprMaMmv-JswrcnTp9Mi5PXKDWmigkOzTBBIAkhdXtLPe7EwIe6Q1gi2gdtLzV08d2y67rMVTHx0Ei0S",
 *     "detail_url": "https://opensea.io/assets/0x495f947276749ce646f68ac8c248420045cb7b5e/55575360221028374465659771733000318579577403829328624053715758637886677712897",
 *     "contract_name": "OpenSea Shared Storefront",
 *     "is_erc1155": true,
 *     "amount": 1,
 *     "protocol": {
 *       "id": "opensea",
 *       "chain": "eth",
 *       "name": "OpenSea",
 *       "site_url": "https://opensea.io",
 *       "logo_url": "https://static.debank.com/image/project/logo_url/opensea/4b23246fac2d4ce53bd8e8079844821c.png",
 *       "has_supported_portfolio": false,
 *       "tvl": 114295.77061458935
 *     },
 *     "pay_token": {
 *       "id": "eth",
 *       "chain": "eth",
 *       "name": "ETH",
 *       "symbol": "ETH",
 *       "display_symbol": null,
 *       "optimized_symbol": "ETH",
 *       "decimals": 18,
 *       "logo_url": "https://static.debank.com/image/token/logo_url/eth/935ae4e4d1d12d59a99717a24f2540b5.png",
 *       "protocol_id": "",
 *       "price": 2510.46,
 *       "is_verified": true,
 *       "is_core": true,
 *       "is_wallet": true,
 *       "time_at": 1628248886,
 *       "amount": 0.0178,
 *       "date_at": "2021-08-06"
 *     },
 *     "attributes": [
 *       {
 *         "trait_type": "Artist",
 *         "value": "SpaceTurtleShip"
 *       },
 *       {
 *         "trait_type": "Edition",
 *         "value": "1"
 *       }
 *     ],
 *     "usd_price": 51.492552,
 *     "collection_id": null
 *   }
 * ```
 * */

const DeBankNftTokenSchema = BaseDeBankTokenSchema.merge(
  z.object({
    contract_id: z.string(),
    description: z.string().nullable(),
    content_type: z.string().nullable(),
    content: z.string(),
    thumbnail_url: z.string(),
    total_supply: z.number(),
    detail_url: z.string(),
    collection_id: z.string(),
    is_core: z.boolean(),
    inner_id: z.string(),
    collection_name: z.string(),
    contract_name: z.string(),
    amount: z.number(),
    usd_price: z.number().optional(),
    is_erc721: z.boolean().optional(),
    is_erc1155: z.boolean().optional(),
  }),
);

const DeBankNftTokenListSchema = z.array(DeBankNftTokenSchema);

export type DeBankNftToken = z.infer<typeof DeBankNftTokenSchema>;
