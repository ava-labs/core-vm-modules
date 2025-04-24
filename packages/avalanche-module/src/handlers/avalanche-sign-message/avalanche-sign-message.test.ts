import { NetworkVMType, RpcMethod } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import { avalancheSignMessage } from './avalanche-sign-message';

const message = 'message to sign';

const mockRequest = {
  method: RpcMethod.AVALANCHE_SIGN_MESSAGE,
  params: [message],
  dappInfo: {
    name: 'Test DApp',
    url: 'test-url',
    icon: 'test-icon-uri',
  },
  requestId: 'requestId',
  sessionId: 'sessionId',
  chainId: 'eip155:1',
};

const mockNetwork = {
  chainId: 1,
  chainName: 'Ethereum',
  logoUri: 'test-logo-uri',
  rpcUrl: 'rpcUrl',
  networkToken: {
    name: 'ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
  vmName: NetworkVMType.EVM,
};

const mockApprovalController = {
  requestApproval: jest.fn(),
  requestPublicKey: jest.fn(),
  onTransactionConfirmed: jest.fn(),
  onTransactionReverted: jest.fn(),
};

describe('avalanche_signMessage', () => {
  beforeEach(() => {
    mockApprovalController.requestApproval.mockResolvedValue({ signedData: '0x1234' });
  });

  it('should return error when params are invalid', async () => {
    const result = await avalancheSignMessage({
      request: { ...mockRequest, params: ['1', '2', '3'] },
      network: mockNetwork,
      approvalController: mockApprovalController,
    });

    expect(result).toEqual({
      error: rpcErrors.invalidParams({ message: 'Params are invalid', data: { cause: result.error } }),
    });
  });

  it('should generate signingData and displayData', async () => {
    await avalancheSignMessage({
      request: mockRequest,
      network: mockNetwork,
      approvalController: mockApprovalController,
    });

    expect(mockApprovalController.requestApproval).toHaveBeenCalledWith({
      displayData: {
        title: 'Sign Message',
        details: [
          {
            title: 'Message',
            items: [message],
          },
        ],
        dAppInfo: {
          action: 'Test DApp is requesting to sign the following message',
          logoUri: 'test-icon-uri',
          name: 'Test DApp',
        },
        network: {
          chainId: 1,
          logoUri: 'test-logo-uri',
          name: 'Ethereum',
        },
      },
      request: mockRequest,
      signingData: {
        accountIndex: undefined,
        data: Buffer.from(message, 'utf-8').toString('hex'),
        type: RpcMethod.AVALANCHE_SIGN_MESSAGE,
      },
    });
  });

  it('should handle success case for approvalController.requestApproval', async () => {
    const result = await avalancheSignMessage({
      request: mockRequest,
      network: mockNetwork,
      approvalController: mockApprovalController,
    });

    expect(result).toEqual({ result: '0x1234' });
  });

  it('should handle error case for approvalController.requestApproval', async () => {
    mockApprovalController.requestApproval.mockResolvedValueOnce({ error: 'User denied message signature' });

    const result = await avalancheSignMessage({
      request: mockRequest,
      network: mockNetwork,
      approvalController: mockApprovalController,
    });

    expect(result).toEqual({ error: 'User denied message signature' });
  });
});
