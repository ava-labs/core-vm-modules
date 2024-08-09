import { NetworkVMType, RpcMethod } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import { avalancheSignMessage } from './avalanche-sign-message';

const message = 'message to sign';

const mockRequest = {
  method: RpcMethod.AVALANCHE_SIGN_MESSAGE,
  params: [message, 0, 'P'],
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
  chainId: 4503599627370471,
  chainName: 'Avalanche (P-Chain)',
  logoUri:
    'https://images.ctfassets.net/gcj8jwzm6086/42aMwoCLblHOklt6Msi6tm/1e64aa637a8cead39b2db96fe3225c18/pchain-square.svg',
  rpcUrl: 'rpcUrl',
  networkToken: {
    name: 'avalanche-2',
    symbol: 'AVAX',
    decimals: 9,
  },
  vmName: NetworkVMType.EVM,
};

const mockApprovalController = {
  requestApproval: jest.fn(),
  onTransactionConfirmed: jest.fn(),
  onTransactionReverted: jest.fn(),
};

describe('avalanche_signMessage', () => {
  beforeEach(() => {
    mockApprovalController.requestApproval.mockResolvedValue({ result: '0x1234' });
  });

  it('should return error when params are invalid', async () => {
    const result = await avalancheSignMessage({
      request: { ...mockRequest, params: ['1', '2', '3'] },
      network: mockNetwork,
      approvalController: mockApprovalController,
    });

    expect(result).toEqual({
      error: rpcErrors.invalidParams('Params are invalid'),
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
        messageDetails: message,
        dAppInfo: {
          action: 'Test DApp requests you to sign the following message',
          logoUri: 'test-icon-uri',
          name: 'Test DApp',
        },
        network: {
          chainId: 4503599627370471,
          logoUri:
            'https://images.ctfassets.net/gcj8jwzm6086/42aMwoCLblHOklt6Msi6tm/1e64aa637a8cead39b2db96fe3225c18/pchain-square.svg',
          name: 'Avalanche (P-Chain)',
        },
      },
      request: mockRequest,
      signingData: {
        accountIndex: 0,
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
