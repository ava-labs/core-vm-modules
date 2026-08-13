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

  it('resolves nothing when the reputation registry does not vouch for the declared registry', async () => {
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

    // The declaration is dApp input: an unvouched registry could be the caller's own
    // contract, so none of the values it returns are shown.
    expect(result).toEqual({
      agentId: '1600',
      agentRegistry: `eip155:43114:${identityAddress}`,
      owner: null,
      metadataUri: null,
      reputationScore: null,
      trustLevel: 'unknown',
    });
  });

  it('does not read a registry declared on a chain other than the connected one', async () => {
    const result = await resolveAgentIdentity({
      declaration: {
        agentId: '1602',
        // Contracts are read on the connected network, so the chain in the prefix would be a
        // label with nothing behind it.
        agentRegistry: `eip155:1:${identityAddress}`,
      },
      rpcUrl: 'https://rpc.example/resolve-agent-identity-test-other-chain',
      chainId: 43114,
      chainName: 'Avalanche',
    });

    expect(Contract).not.toHaveBeenCalled();
    expect(result).toEqual({
      agentId: '1602',
      agentRegistry: `eip155:1:${identityAddress}`,
      owner: null,
      metadataUri: null,
      reputationScore: null,
      trustLevel: 'unknown',
    });
  });

  it('falls back to unknown reputation when feedback reads fail', async () => {
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
        getIdentityRegistry: jest.fn().mockResolvedValue(identityAddress),
        getSummary: jest.fn(),
        readAllFeedback: jest.fn().mockRejectedValue(new Error('rpc down')),
      };
    });

    Contract.mockImplementation(customContract);

    const result = await resolveAgentIdentity({
      declaration: {
        agentId: '1601',
        agentRegistry: `eip155:43114:${identityAddress}`,
      },
      rpcUrl: 'https://rpc.example/resolve-agent-identity-test-feedback-failure',
      chainId: 43114,
      chainName: 'Avalanche',
    });

    expect(result.owner).toBe('0x1234567890123456789012345678901234567890');
    expect(result.metadataUri).toBe('ipfs://agent.json');
    expect(result.reputationScore).toBeNull();
    expect(result.trustLevel).toBe('unknown');
  });
});
