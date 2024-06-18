import { object, string, boolean, z } from 'zod';

export type Wei = bigint;

export type NetworkFees = {
  low: { maxPriorityFeePerGas: Wei; maxFeePerGas: Wei };
  medium: { maxPriorityFeePerGas: Wei; maxFeePerGas: Wei };
  high: { maxPriorityFeePerGas: Wei; maxFeePerGas: Wei };
  baseFee: Wei;
};

export interface Module {
  getManifest: () => Manifest | undefined;
  getBalances: () => Promise<string>;
  getTransactionHistory: (params: GetTransactionHistory) => Promise<TransactionHistoryResponse>;
  getNetworkFee: () => Promise<NetworkFees>;
  getAddress: () => Promise<string>;
}

const sourceSchema = object({
  checksum: string(),
  location: object({
    npm: object({
      filePath: string(),
      packageName: string(),
      registry: string(),
    }),
  }),
});

const manifestSchema = object({
  name: string(),
  version: string(),
  description: string(),
  sources: object({
    module: sourceSchema,
    provider: sourceSchema.optional(),
  }),
  network: object({
    chainIds: string().array(),
    namespaces: string().array(),
  }),
  cointype: string(),
  permissions: object({
    rpc: object({
      dapps: boolean(),
      methods: string().array(),
    }),
  }),
  manifestVersion: string(),
});

export type Manifest = z.infer<typeof manifestSchema>;

export const parseManifest = (params: unknown): z.SafeParseReturnType<unknown, Manifest> => {
  return manifestSchema.safeParse(params);
};

export type GetTransactionHistory = {
  chainId: number;
  isTestnet: boolean;
  networkToken: NetworkToken;
  explorerUrl: string;
  address: string;
  nextPageToken?: string;
  offset?: number;
  glacierApiUrl?: string;
};

export type TransactionHistoryResponse = {
  transactions: Transaction[];
  nextPageToken?: string;
};

export type Transaction = {
  isContractCall: boolean;
  isIncoming: boolean;
  isOutgoing: boolean;
  isSender: boolean;
  timestamp: number;
  hash: string;
  from: string;
  to: string;
  tokens: TxToken[];
  gasPrice?: string;
  gasUsed: string;
  txType?: TransactionType;
  chainId: string; // chainId from ActiveNetwork used to fetch tx
  method?: string;
  explorerLink: string;
};

export interface TxToken {
  decimal?: string;
  name: string;
  symbol: string;
  amount: string;
  imageUri?: string;
  from?: RichAddress;
  to?: RichAddress;
  collectableTokenId?: string;
  type: TokenType;
}

export enum TransactionType {
  BRIDGE = 'Bridge',
  SWAP = 'Swap',
  SEND = 'Send',
  RECEIVE = 'Receive',
  NFT_BUY = 'NFTBuy',
  APPROVE = 'Approve',
  TRANSFER = 'Transfer',
  NFT_SEND = 'NFTSend',
  NFT_RECEIVE = 'NFTReceive',
  AIRDROP = 'Airdrop',
  FILL_ORDER = 'FillOrder',
  UNWRAP = 'Unwrap',
  UNKNOWN = 'UNKNOWN',
}

export enum TokenType {
  NATIVE = 'NATIVE',
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  ERC1155 = 'ERC1155',
}

type RichAddress = {
  /**
   * The contract name.
   */
  name?: string;
  /**
   * The contract symbol.
   */
  symbol?: string;
  /**
   * The number of decimals the token uses. For example `6`, means to divide the token amount by `1000000` to get its user representation.
   */
  decimals?: number;
  /**
   * The logo uri for the address.
   */
  logoUri?: string;
  /**
   * A wallet or contract address in mixed-case checksum encoding.
   */
  address: string;
};

export interface NetworkToken {
  name: string;
  symbol: string;
  description: string;
  decimals: number;
  logoUri: string;
}
