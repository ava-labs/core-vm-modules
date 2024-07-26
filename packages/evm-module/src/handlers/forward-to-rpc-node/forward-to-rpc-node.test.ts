import { forwardToRpcNode } from './forward-to-rpc-node';
import { getProvider } from '../../utils/get-provider';
import { rpcErrors } from '@metamask/rpc-errors';
import { NetworkVMType, RpcMethod } from '@avalabs/vm-module-types';

jest.mock('../../utils/get-provider');
jest.mock('@metamask/rpc-errors', () => ({
  rpcErrors: {
    internal: jest.fn().mockImplementation((message) => ({ error: `mocked error: ${message}` })),
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
      multiContractAddress: undefined,
      pollingInterval: 1000,
    });
    expect(mockProvider.send).toHaveBeenCalledWith(request.method, request.params);
    expect(result).toEqual({ result: expectedResult });
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

    expect(rpcErrors.internal).toHaveBeenCalledWith(error.message);
    expect(result).toHaveProperty('error');
    expect(result.error).toEqual({ error: `mocked error: ${error.message}` });
  });
});
