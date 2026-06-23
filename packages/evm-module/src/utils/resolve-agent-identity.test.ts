import { resolveAgentIdentity } from './resolve-agent-identity';
import { getProvider } from './get-provider';

const mockProvider = { provider: 'mock' };
const identityAddress = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const reputationAddress = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63';

jest.mock('./get-provider', () => ({
  getProvider: jest.fn(),
}));

jest.mock('ethers', () => {
  const contractMock = jest.fn((address: string, _abi: unknown, provider: unknown) => {
    if (address === identityAddress) {
      return {
        provider,
        ownerOf: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
        tokenURI: jest.fn().mockResolvedValue('ipfs://agent.json'),
        agentURI: jest.fn(),
        getMetadata: jest.fn(),
      };
    }

    if (address === reputationAddress) {
      return {
        provider,
        getScore: jest.fn().mockResolvedValue(88n),
        getReputation: jest.fn(),
        reputationScores: jest.fn(),
        scores: jest.fn(),
        reputations: jest.fn(),
      };
    }

    throw new Error(`Unexpected contract address: ${address}`);
  });

  return {
    Contract: contractMock,
    getAddress: jest.fn((address: string) => address),
    toUtf8String: jest.fn(() => 'decoded-metadata'),
  };
});

const mockGetProvider = getProvider as jest.MockedFunction<typeof getProvider>;
const { Contract } = jest.requireMock('ethers') as { Contract: jest.Mock };

describe('resolveAgentIdentity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProvider.mockResolvedValue(mockProvider as never);
  });

  it('uses getProvider with customRpcHeaders so identity eth_calls inherit RPC headers', async () => {
    const result = await resolveAgentIdentity({
      declaration: {
        agentId: '1599',
        agentRegistry: `eip155:43114:${identityAddress}`,
      },
      rpcUrl: 'https://rpc.example/resolve-agent-identity-test',
      chainId: 43114,
      chainName: 'Avalanche',
      customRpcHeaders: {
        Authorization: 'Bearer secret',
        'X-Trace-Id': 'trace-123',
      },
    });

    expect(mockGetProvider).toHaveBeenCalledWith({
      chainId: 43114,
      chainName: 'Avalanche',
      rpcUrl: 'https://rpc.example/resolve-agent-identity-test',
      customRpcHeaders: {
        Authorization: 'Bearer secret',
        'X-Trace-Id': 'trace-123',
      },
    });
    expect(Contract).toHaveBeenNthCalledWith(1, identityAddress, expect.anything(), mockProvider);
    expect(Contract).toHaveBeenNthCalledWith(2, reputationAddress, expect.anything(), mockProvider);
    expect(result).toEqual({
      agentId: '1599',
      agentRegistry: `eip155:43114:${identityAddress}`,
      owner: '0x1234567890123456789012345678901234567890',
      reputationScore: 88,
      metadataUri: 'ipfs://agent.json',
      trustLevel: 'high',
    });
  });
});
