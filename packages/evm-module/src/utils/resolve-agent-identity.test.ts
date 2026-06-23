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
        getIdentityRegistry: jest.fn().mockResolvedValue(identityAddress),
        getSummary: jest.fn().mockResolvedValue([2n, 88n, 0n]),
        readAllFeedback: jest.fn().mockResolvedValue([
          ['0x1111111111111111111111111111111111111111', '0x2222222222222222222222222222222222222222'],
          [1n, 2n],
          [90n, 86n],
          [0n, 0n],
          ['starred', 'starred'],
          ['', ''],
          [false, false],
        ]),
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

  it('falls back to averaging standard ERC-8004 feedback when summary cannot be queried', async () => {
    const reputationContract = Contract.mock.results[1]?.value;
    if (reputationContract) {
      reputationContract.getSummary.mockRejectedValueOnce(new Error('clientAddresses required'));
    }

    const result = await resolveAgentIdentity({
      declaration: {
        agentId: '1599',
        agentRegistry: `eip155:43114:${identityAddress}`,
      },
      rpcUrl: 'https://rpc.example/resolve-agent-identity-test',
      chainId: 43114,
      chainName: 'Avalanche',
    });

    expect(result.reputationScore).toBe(88);
    expect(result.trustLevel).toBe('high');
  });

  it('ignores reputation when the reputation registry is bound to a different identity registry', async () => {
    const customContract = jest.fn((address: string, _abi: unknown, provider: unknown) => {
      if (address === identityAddress) {
        return {
          provider,
          ownerOf: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
          tokenURI: jest.fn().mockResolvedValue('ipfs://agent.json'),
          agentURI: jest.fn(),
          getMetadata: jest.fn(),
        };
      }

      return {
        provider,
        getIdentityRegistry: jest.fn().mockResolvedValue('0x9999999999999999999999999999999999999999'),
        getSummary: jest.fn(),
        readAllFeedback: jest.fn(),
      };
    });

    Contract.mockImplementation(customContract);

    const result = await resolveAgentIdentity({
      declaration: {
        agentId: '1600',
        agentRegistry: `eip155:43114:${identityAddress}`,
      },
      rpcUrl: 'https://rpc.example/resolve-agent-identity-test-mismatch',
      chainId: 43114,
      chainName: 'Avalanche',
    });

    expect(result.reputationScore).toBeNull();
    expect(result.trustLevel).toBe('unknown');
  });
});
