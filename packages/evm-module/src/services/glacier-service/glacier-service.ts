import {
  BlockchainId,
  CurrencyCode,
  Erc1155Token,
  Erc721Token,
  type GetNativeBalanceResponse,
  type ListCChainAtomicBalancesResponse,
  type ListErc1155BalancesResponse,
  type ListErc20BalancesResponse,
  type ListErc721BalancesResponse,
  type ListPChainBalancesResponse,
  type ListXChainBalancesResponse,
  Network,
} from '@avalabs/glacier-sdk';
import { GlacierService } from '@internal/utils';

export class EvmGlacierService extends GlacierService {
  async reindexNft({
    address,
    chainId,
    tokenId,
  }: {
    address: string;
    chainId: string;
    tokenId: string;
  }): Promise<void> {
    await this.glacierSdk.nfTs.reindexNft({
      address,
      chainId,
      tokenId,
    });
  }

  async getTokenDetails({
    address,
    chainId,
    tokenId,
  }: {
    address: string;
    chainId: string;
    tokenId: string;
  }): Promise<Erc721Token | Erc1155Token> {
    return this.glacierSdk.nfTs.getTokenDetails({
      address,
      chainId,
      tokenId,
    });
  }

  async getChainBalance(params: {
    blockchainId: BlockchainId;
    network: Network;
    blockTimestamp?: number;
    addresses?: string;
  }): Promise<ListPChainBalancesResponse | ListXChainBalancesResponse | ListCChainAtomicBalancesResponse> {
    return this.glacierSdk.primaryNetworkBalances.getBalancesByAddresses(params);
  }

  async getNativeBalance({
    chainId,
    address,
    currency,
  }: {
    chainId: string;
    address: string;
    currency: CurrencyCode;
  }): Promise<GetNativeBalanceResponse> {
    return this.glacierSdk.evmBalances.getNativeBalance({
      chainId,
      address,
      currency: currency.toLocaleLowerCase() as CurrencyCode,
    });
  }

  async listErc721Balances({
    chainId,
    address,
    pageSize,
    pageToken,
  }: {
    chainId: string;
    address: string;
    pageSize: number;
    pageToken?: string;
  }): Promise<ListErc721BalancesResponse> {
    return this.glacierSdk.evmBalances.listErc721Balances({
      chainId,
      address,
      pageSize,
      pageToken,
    });
  }

  async listErc1155Balances({
    chainId,
    address,
    pageSize,
    pageToken,
  }: {
    chainId: string;
    address: string;
    pageSize: number;
    pageToken?: string;
  }): Promise<ListErc1155BalancesResponse> {
    return this.glacierSdk.evmBalances.listErc1155Balances({
      chainId,
      address,
      pageSize,
      pageToken,
    });
  }

  async listErc20Balances({
    chainId,
    address,
    currency,
    pageSize,
    pageToken,
  }: {
    chainId: string;
    address: string;
    currency: CurrencyCode;
    pageSize: number;
    pageToken?: string;
  }): Promise<ListErc20BalancesResponse> {
    return this.glacierSdk.evmBalances.listErc20Balances({
      chainId,
      address,
      currency: currency.toLocaleLowerCase() as CurrencyCode,
      pageSize,
      pageToken,
    });
  }

  async listTransactions({
    chainId,
    address,
    pageToken,
    pageSize,
  }: {
    chainId: string;
    address: string;
    pageToken?: string;
    pageSize?: number;
  }) {
    return this.glacierSdk.evmTransactions.listTransactions({
      chainId,
      address,
      pageToken,
      pageSize,
    });
  }
}
