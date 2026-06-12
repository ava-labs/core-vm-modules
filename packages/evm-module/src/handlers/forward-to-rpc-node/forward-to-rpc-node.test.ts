import { forwardToRpcNode } from './forward-to-rpc-node';
import { getProvider } from '../../utils/get-provider';
import { rpcErrors } from '@metamask/rpc-errors';
import { NetworkVMType, RpcMethod } from '@avalabs/vm-module-types';

jest.mock('../../utils/get-provider');
jest.mock('@metamask/rpc-errors', () => ({
  rpcErrors: {
    internal: jest.fn().mockImplementation((opts) => ({ error: opts })),
  },
}));

const mockProvider = {
  send: jest.fn(),
};

const network = {
  chainId: 1,
  chainName: 'mainnet',
  rpcUrl: 'https://example.com',
  networkToken: {
    name: 'ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
  vmName: NetworkVMType.EVM,
};

describe('forwardToRpcNode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getProvider as jest.Mock).mockReturnValue(mockProvider);
  });

  it('should forward the request and return the result on success', async () => {
    const request = {
      method: 'eth_chainId' as RpcMethod,
      params: [1, 2],
      requestId: 'requestId',
      sessionId: 'sessionId',
      chainId: 'eip155:1',
      dappInfo: {
        name: 'some dapp',
        url: 'some url',
        icon: 'some icon',
      },
    };

    const expectedResult = '0x1';

    mockProvider.send.mockResolvedValue(expectedResult);

    const result = await forwardToRpcNode(request, network);

    expect(getProvider).toHaveBeenCalledWith({
      chainId: network.chainId,
      chainName: network.chainName,
      rpcUrl: network.rpcUrl,
      pollingInterval: 1000,
      customRpcHeaders: undefined,
    });
    expect(mockProvider.send).toHaveBeenCalledWith(request.method, request.params);
    expect(result).toEqual({ result: expectedResult });
  });

  it('does NOT enable Multicall3 aggregation (would rewrite msg.sender and break caller-dependent reads)', async () => {
    const request = {
      method: 'eth_call' as RpcMethod,
      params: [{ from: '0xabc', to: '0xdef', data: '0xfc6f7865' }, 'latest'],
      requestId: 'requestId',
      sessionId: 'sessionId',
      chainId: 'eip155:1',
      dappInfo: { name: 'some dapp', url: 'some url', icon: 'some icon' },
    };

    // network carries a multicall utility address — it must NOT be forwarded to the provider.
    const networkWithMulticall = {
      ...network,
      utilityAddresses: { multicall: '0xcA11bde05977b3631167028862bE2a173976CA11' },
    };

    mockProvider.send.mockResolvedValue('0x1');

    await forwardToRpcNode(request, networkWithMulticall);

    const passedParams = (getProvider as jest.Mock).mock.calls[0][0];
    expect(passedParams).not.toHaveProperty('multiContractAddress');
  });

  it('should handle errors and return a formatted error response', async () => {
    const request = {
      method: 'eth_accounts' as RpcMethod,
      params: [],
      requestId: 'requestId',
      sessionId: 'sessionId',
      chainId: 'eip155:1',
      dappInfo: {
        name: 'some dapp',
        url: 'some url',
        icon: 'some icon',
      },
    };

    const error = new Error('Test error');

    mockProvider.send.mockRejectedValue(error);

    const result = await forwardToRpcNode(request, network);

    // No structured JSON-RPC payload -> fall back to a generic internal error.
    expect(rpcErrors.internal).toHaveBeenCalledWith(error.message);
    expect(result).toHaveProperty('error');
  });

  it('relays the node JSON-RPC error verbatim (code + message + revert data) for reverted calls', async () => {
    const request = {
      method: 'eth_call' as RpcMethod,
      params: [{ to: '0x0', data: '0x' }, 'latest'],
      requestId: 'requestId',
      sessionId: 'sessionId',
      chainId: 'eip155:1',
      dappInfo: {
        name: 'some dapp',
        url: 'some url',
        icon: 'some icon',
      },
    };

    // Shape ethers v6 throws for a reverted eth_call: the raw node error
    // (code 3 = execution reverted, with the revert bytes) lives under `info.error`.
    const nodeError = {
      code: 3,
      message: 'execution reverted: Multicall3: call failed',
      data: '0x08c379a0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000174d756c746963616c6c333a2063616c6c206661696c6564000000000000000000',
    };
    const error = Object.assign(new Error('execution reverted'), { info: { error: nodeError } });

    mockProvider.send.mockRejectedValue(error);

    const result = await forwardToRpcNode(request, network);

    // Forwarded as-is — NOT re-wrapped as -32603 — so dApps decode the revert like a direct RPC connection.
    expect(rpcErrors.internal).not.toHaveBeenCalled();
    expect(result).toEqual({ error: nodeError });
  });
});
