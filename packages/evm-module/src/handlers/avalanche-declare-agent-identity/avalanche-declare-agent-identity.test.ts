import { RpcMethod, NetworkVMType, type Network, type RpcRequest } from '@avalabs/vm-module-types';

import { avalancheDeclareAgentIdentity } from './avalanche-declare-agent-identity';
import { resolveAgentIdentity } from '../../utils/resolve-agent-identity';

jest.mock('../../utils/resolve-agent-identity', () => ({
  resolveAgentIdentity: jest.fn(),
}));

const mockResolveAgentIdentity = resolveAgentIdentity as jest.MockedFunction<typeof resolveAgentIdentity>;

const request = {
  requestId: '1',
  sessionId: '2',
  method: RpcMethod.AVALANCHE_DECLARE_AGENT_IDENTITY,
  chainId: 'eip155:43114',
  params: {
    agentId: '1599',
    agentRegistry: 'eip155:43114:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
  },
  dappInfo: {
    name: 'Test dApp',
    url: 'https://example.com',
    icon: 'https://example.com/icon.png',
  },
} as const;

const network = {
  chainId: 43114,
  chainName: 'Avalanche',
  rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
  logoUri: 'logo',
  networkToken: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
  vmName: NetworkVMType.EVM,
} as const;

describe('avalancheDeclareAgentIdentity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns resolved identity', async () => {
    mockResolveAgentIdentity.mockResolvedValue({
      agentId: '1599',
      agentRegistry: 'eip155:43114:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
      owner: '0x1234567890123456789012345678901234567890',
      reputationScore: 88,
      metadataUri: 'ipfs://agent.json',
      trustLevel: 'high',
    });

    const result = await avalancheDeclareAgentIdentity({
      request: request as unknown as RpcRequest,
      network: network as unknown as Network,
    });

    expect(mockResolveAgentIdentity).toHaveBeenCalledWith({
      declaration: request.params,
      rpcUrl: network.rpcUrl,
    });
    expect(result).toEqual({
      result: {
        agentId: '1599',
        agentRegistry: 'eip155:43114:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
        owner: '0x1234567890123456789012345678901234567890',
        reputationScore: 88,
        metadataUri: 'ipfs://agent.json',
        trustLevel: 'high',
      },
    });
  });

  it('returns invalid params for bad payloads', async () => {
    const result = await avalancheDeclareAgentIdentity({
      request: { ...request, params: { agentRegistry: 'bad' } } as unknown as RpcRequest,
      network: network as unknown as Network,
    });

    expect(result).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          code: -32602,
          message: 'Agent identity params are invalid',
        }),
      }),
    );
  });
});
