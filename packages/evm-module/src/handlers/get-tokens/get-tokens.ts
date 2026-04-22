import { z } from 'zod';
import { TokenType, type NetworkContractToken } from '@avalabs/vm-module-types';
import { fetchAndVerify } from '@internal/utils';

// Proxy API emits `contractType` with dashes (e.g. "ERC-20"),
// while the `TokenType` enum uses the dash-less form (e.g. "ERC20").
const PROXY_API_CONTRACT_TYPE_TO_TOKEN_TYPE: Record<string, TokenType> = {
  'ERC-20': TokenType.ERC20,
  'ERC-721': TokenType.ERC721,
  'ERC-1155': TokenType.ERC1155,
  'NON-ERC': TokenType.NONERC,
  SPL: TokenType.SPL,
};

const ContractTypeSchema = z.string().transform((raw, ctx) => {
  const mapped = PROXY_API_CONTRACT_TYPE_TO_TOKEN_TYPE[raw];
  if (!mapped) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Unknown contractType: ${raw}`,
    });
    return z.NEVER;
  }
  return mapped;
});

const ProxyApiTokensSchema = z.array(
  z.object({
    address: z.string(),
    chainId: z.number(),
    contractType: ContractTypeSchema,
    decimals: z.number(),
    internalId: z.string().optional(),
    isNative: z.boolean(),
    logoUri: z.string().optional(),
    name: z.string(),
    symbol: z.string(),
    caip2Id: z.string().optional(),
    color: z.string().optional(),
  }),
);

export async function getTokens({
  chainId,
  proxyApiUrl,
}: {
  chainId: number;
  proxyApiUrl: string;
}): Promise<NetworkContractToken[]> {
  const rawTokens = await fetchAndVerify([`${proxyApiUrl}/tokens?evmChainId=${chainId}`], ProxyApiTokensSchema);

  return rawTokens.map((token) => ({ ...token, type: token.contractType }) as NetworkContractToken);
}
