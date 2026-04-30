import type { AgentIdentity, AgentIdentityDeclaration } from '@avalabs/vm-module-types';
import { Contract, JsonRpcProvider, getAddress, toUtf8String } from 'ethers';

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const DEFAULT_REPUTATION_REGISTRIES: Record<number, string> = {
  43114: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
};

const IDENTITY_ABI = [
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function agentURI(uint256 agentId) view returns (string)',
  'function getMetadata(uint256 agentId, string metadataKey) view returns (bytes)',
] as const;

const REPUTATION_ABI = [
  'function getScore(uint256 agentId) view returns (int256)',
  'function getReputation(uint256 agentId) view returns (int256)',
  'function reputationScores(uint256 agentId) view returns (int256)',
  'function scores(uint256 agentId) view returns (int256)',
  'function reputations(uint256 agentId) view returns (int256)',
] as const;

const cache = new Map<string, { expiresAt: number; value: AgentIdentity }>();

const getTrustLevel = (score: number | null): AgentIdentity['trustLevel'] => {
  if (score === null) return 'unknown';
  if (score >= 75) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

const clampScore = (value: bigint | number | null): number | null => {
  if (value === null) return null;
  const score = typeof value === 'bigint' ? Number(value) : value;
  if (!Number.isFinite(score)) return null;
  return Math.max(0, Math.min(100, Math.trunc(score)));
};

const parseAgentRegistry = (agentRegistry: string) => {
  const [namespace, chainId, address] = agentRegistry.split(':');
  if (namespace !== 'eip155' || !chainId || !address) {
    return null;
  }

  const parsedChainId = Number(chainId);
  if (!Number.isInteger(parsedChainId)) {
    return null;
  }

  try {
    return { chainId: parsedChainId, address: getAddress(address) };
  } catch {
    return null;
  }
};

const buildFallback = (declaration: AgentIdentityDeclaration): AgentIdentity => ({
  agentId: declaration.agentId,
  agentRegistry: declaration.agentRegistry,
  owner: null,
  reputationScore: null,
  metadataUri: null,
  trustLevel: 'unknown',
});

const callFirst = async <T>(calls: (() => Promise<T>)[]): Promise<T | null> => {
  const results = await Promise.allSettled(calls.map((call) => call()));
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value != null) {
      return result.value;
    }
  }
  return null;
};

const decodeMetadata = (value: string): string | null => {
  if (!value || value === '0x') return null;
  try {
    return toUtf8String(value);
  } catch {
    return null;
  }
};

export const resolveAgentIdentity = async ({
  declaration,
  rpcUrl,
}: {
  declaration: AgentIdentityDeclaration;
  rpcUrl: string;
}): Promise<AgentIdentity> => {
  const cached = cache.get(`${rpcUrl}:${declaration.agentRegistry}:${declaration.agentId}`);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const parsedRegistry = parseAgentRegistry(declaration.agentRegistry);
  if (!parsedRegistry) {
    return buildFallback(declaration);
  }

  if (!/^\d+$/.test(declaration.agentId)) {
    return buildFallback({
      ...declaration,
      agentRegistry: `eip155:${parsedRegistry.chainId}:${parsedRegistry.address}`,
    });
  }

  const normalizedDeclaration = {
    ...declaration,
    agentRegistry: `eip155:${parsedRegistry.chainId}:${parsedRegistry.address}`,
  };

  const fallback = buildFallback(normalizedDeclaration);

  const provider = new JsonRpcProvider(rpcUrl);
  const identityContract = new Contract(parsedRegistry.address, IDENTITY_ABI, provider);

  const reputationRegistry = DEFAULT_REPUTATION_REGISTRIES[parsedRegistry.chainId];
  const reputationContract = reputationRegistry ? new Contract(reputationRegistry, REPUTATION_ABI, provider) : null;

  const [owner, metadataUri, reputationScore] = await Promise.all([
    callFirst<string | null>([async () => getAddress(await identityContract.ownerOf(BigInt(declaration.agentId)))]),
    callFirst<string | null>([
      async () => await identityContract.tokenURI(BigInt(declaration.agentId)),
      async () => await identityContract.agentURI(BigInt(declaration.agentId)),
      async () => decodeMetadata(await identityContract.getMetadata(BigInt(declaration.agentId), 'agentURI')),
      async () => decodeMetadata(await identityContract.getMetadata(BigInt(declaration.agentId), 'uri')),
    ]),
    reputationContract
      ? callFirst<bigint | number>([
          async () => await reputationContract.getScore(BigInt(declaration.agentId)),
          async () => await reputationContract.getReputation(BigInt(declaration.agentId)),
          async () => await reputationContract.reputationScores(BigInt(declaration.agentId)),
          async () => await reputationContract.scores(BigInt(declaration.agentId)),
          async () => await reputationContract.reputations(BigInt(declaration.agentId)),
        ])
      : Promise.resolve(null),
  ]);

  const resolved: AgentIdentity = {
    ...fallback,
    owner: owner ?? null,
    metadataUri: metadataUri ?? null,
    reputationScore: clampScore(reputationScore ?? null),
    trustLevel: getTrustLevel(clampScore(reputationScore ?? null)),
  };

  cache.set(`${rpcUrl}:${declaration.agentRegistry}:${declaration.agentId}`, {
    expiresAt: Date.now() + FIVE_MINUTES_MS,
    value: resolved,
  });

  return resolved;
};
