import type { AgentIdentity, AgentIdentityDeclaration } from '@avalabs/vm-module-types';
import { Contract, getAddress, toUtf8String } from 'ethers';

import { getProvider } from './get-provider';

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
  'function getSummary(uint256 agentId, address[] clientAddresses, string tag1, string tag2) view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)',
  'function readAllFeedback(uint256 agentId, address[] clientAddresses, string tag1, string tag2, bool includeRevoked) view returns (address[] clients, uint64[] feedbackIndexes, int128[] values, uint8[] valueDecimals, string[] tag1s, string[] tag2s, bool[] isRevoked)',
  'function getIdentityRegistry() view returns (address)',
] as const;

type IdentityContract = Contract & {
  ownerOf: (tokenId: bigint) => Promise<string>;
  tokenURI: (tokenId: bigint) => Promise<string>;
  agentURI: (agentId: bigint) => Promise<string>;
  getMetadata: (agentId: bigint, metadataKey: string) => Promise<string>;
};

type ReputationSummary = {
  count: bigint | number;
  summaryValue: bigint | number;
  summaryValueDecimals: bigint | number;
};

type ReputationFeedback = {
  value: bigint | number;
  valueDecimals: bigint | number;
  tag1?: string;
  tag2?: string;
  isRevoked?: boolean;
};

type ReputationSummaryTuple = readonly [bigint | number, bigint | number, bigint | number];
type ReputationFeedbackTuple = readonly [
  string[],
  (bigint | number)[],
  (bigint | number)[],
  (bigint | number)[],
  string[],
  string[],
  boolean[],
];

type ReputationFeedbackResult =
  | ReputationFeedbackTuple
  | {
      clients: string[];
      feedbackIndexes: (bigint | number)[];
      values: (bigint | number)[];
      valueDecimals: (bigint | number)[];
      tag1s: string[];
      tag2s: string[];
      isRevoked: boolean[];
    };

type ReputationContract = Contract & {
  getIdentityRegistry: () => Promise<string>;
  getSummary: (
    agentId: bigint,
    clientAddresses: string[],
    tag1: string,
    tag2: string,
  ) => Promise<ReputationSummaryTuple | ReputationSummary>;
  readAllFeedback: (
    agentId: bigint,
    clientAddresses: string[],
    tag1: string,
    tag2: string,
    includeRevoked: boolean,
  ) => Promise<ReputationFeedbackResult>;
};

const cache = new Map<string, { expiresAt: number; value: AgentIdentity }>();

const getTrustLevel = (score: number | null): AgentIdentity['trustLevel'] => {
  if (score === null) return 'unknown';
  if (score >= 75) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

const clampScore = (value: number | null): number | null => {
  if (value === null) return null;
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.trunc(value)));
};

const toNumber = (value: bigint | number): number | null => {
  const numeric = typeof value === 'bigint' ? Number(value) : value;
  return Number.isFinite(numeric) ? numeric : null;
};

const scaleFixedPoint = (value: bigint | number, decimals: bigint | number): number | null => {
  const numericValue = toNumber(value);
  const numericDecimals = toNumber(decimals);

  if (numericValue === null || numericDecimals === null || numericDecimals < 0) {
    return null;
  }

  return numericValue / 10 ** numericDecimals;
};

const isReputationSummaryTuple = (
  summary: ReputationSummaryTuple | ReputationSummary,
): summary is ReputationSummaryTuple => Array.isArray(summary);

const isReputationFeedbackTuple = (feedback: ReputationFeedbackResult): feedback is ReputationFeedbackTuple =>
  Array.isArray(feedback);

const getSummaryValue = (summary: ReputationSummaryTuple | ReputationSummary): ReputationSummary => {
  if (isReputationSummaryTuple(summary)) {
    return {
      count: summary[0],
      summaryValue: summary[1],
      summaryValueDecimals: summary[2],
    };
  }

  return summary;
};

const getFeedbackValues = (feedback: ReputationFeedbackResult): ReputationFeedback[] => {
  const values = isReputationFeedbackTuple(feedback) ? feedback[2] : feedback.values;
  const valueDecimals = isReputationFeedbackTuple(feedback) ? feedback[3] : feedback.valueDecimals;
  const tag1s = isReputationFeedbackTuple(feedback) ? feedback[4] : feedback.tag1s;
  const tag2s = isReputationFeedbackTuple(feedback) ? feedback[5] : feedback.tag2s;
  const revoked = isReputationFeedbackTuple(feedback) ? feedback[6] : feedback.isRevoked;

  return values.map((value: bigint | number, index: number) => ({
    value,
    valueDecimals: valueDecimals[index] ?? 0,
    tag1: tag1s[index],
    tag2: tag2s[index],
    isRevoked: revoked[index],
  }));
};

const averageScores = (scores: Array<number | null>): number | null => {
  const filtered = scores.filter((score): score is number => score !== null);
  if (!filtered.length) return null;
  return filtered.reduce((sum, score) => sum + score, 0) / filtered.length;
};

const STARRED_TAG = 'starred';

const dedupeAddresses = (addresses: string[]): string[] => {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const address of addresses) {
    try {
      const normalized = getAddress(address);
      if (!seen.has(normalized)) {
        seen.add(normalized);
        deduped.push(normalized);
      }
    } catch {
      continue;
    }
  }

  return deduped;
};

const getFeedbackClients = (feedback: ReputationFeedbackResult): string[] =>
  isReputationFeedbackTuple(feedback) ? feedback[0] : feedback.clients;

const resolveReputationScore = async (
  reputationContract: ReputationContract,
  parsedRegistryAddress: string,
  agentId: bigint,
): Promise<number | null> => {
  const identityRegistry = getAddress(await reputationContract.getIdentityRegistry());
  if (identityRegistry !== parsedRegistryAddress) {
    return null;
  }

  const feedbackResult = await reputationContract.readAllFeedback(agentId, [], STARRED_TAG, '', false);
  const feedback = getFeedbackValues(feedbackResult)
    .filter((entry) => entry.tag1 === undefined || entry.tag1 === STARRED_TAG)
    .filter((entry) => !entry.isRevoked);

  const clientAddresses = dedupeAddresses(getFeedbackClients(feedbackResult));
  if (clientAddresses.length) {
    const summary = getSummaryValue(await reputationContract.getSummary(agentId, clientAddresses, STARRED_TAG, ''));
    const count = toNumber(summary.count);
    if (count) {
      return scaleFixedPoint(summary.summaryValue, summary.summaryValueDecimals);
    }
  }

  return averageScores(feedback.map((entry) => scaleFixedPoint(entry.value, entry.valueDecimals)));
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
  chainId,
  chainName,
  customRpcHeaders,
}: {
  declaration: AgentIdentityDeclaration;
  rpcUrl: string;
  chainId: number;
  chainName: string;
  customRpcHeaders?: Record<string, string>;
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

  const provider = await getProvider({
    chainId,
    chainName,
    rpcUrl,
    customRpcHeaders,
  });
  const identityContract = new Contract(parsedRegistry.address, IDENTITY_ABI, provider) as IdentityContract;

  const reputationRegistry = DEFAULT_REPUTATION_REGISTRIES[parsedRegistry.chainId];
  const reputationContract = reputationRegistry
    ? (new Contract(reputationRegistry, REPUTATION_ABI, provider) as ReputationContract)
    : null;

  const [owner, metadataUri, reputationScore] = await Promise.all([
    callFirst<string | null>([async () => getAddress(await identityContract.ownerOf(BigInt(declaration.agentId)))]),
    callFirst<string | null>([
      async () => await identityContract.tokenURI(BigInt(declaration.agentId)),
      async () => await identityContract.agentURI(BigInt(declaration.agentId)),
      async () => decodeMetadata(await identityContract.getMetadata(BigInt(declaration.agentId), 'agentURI')),
      async () => decodeMetadata(await identityContract.getMetadata(BigInt(declaration.agentId), 'uri')),
    ]),
    reputationContract
      ? resolveReputationScore(reputationContract, parsedRegistry.address, BigInt(declaration.agentId))
      : Promise.resolve(null),
  ]);

  const normalizedReputationScore = clampScore(reputationScore ?? null);

  const resolved: AgentIdentity = {
    ...fallback,
    owner: owner ?? null,
    metadataUri: metadataUri ?? null,
    reputationScore: normalizedReputationScore,
    trustLevel: getTrustLevel(normalizedReputationScore),
  };

  cache.set(`${rpcUrl}:${declaration.agentRegistry}:${declaration.agentId}`, {
    expiresAt: Date.now() + FIVE_MINUTES_MS,
    value: resolved,
  });

  return resolved;
};
