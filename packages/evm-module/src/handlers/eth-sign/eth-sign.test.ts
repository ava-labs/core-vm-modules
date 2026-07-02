import { ethSign } from './eth-sign';
import { AlertType, NetworkVMType, RpcMethod } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import { rpcErrorOpts } from '@internal/utils';

// doesn't print the ugly console errors out
jest.spyOn(global.console, 'error').mockImplementation(() => {});

const mockBlockaid = {
  evm: {
    transaction: {
      scan: jest.fn().mockResolvedValue({ validation: { result_type: 'Benign' } }),
    },
    jsonRpc: {
      scan: jest.fn().mockResolvedValue({ validation: { result_type: 'Benign' } }),
    },
  },
};

jest.mock('./schemas/parse-request-params/parse-request-params', () => ({
  parseRequestParams: jest.fn(),
}));

jest.mock('./utils/is-typed-data-valid', () => ({
  isTypedDataValid: jest.fn(),
  isTypedDataV1Valid: jest.fn(),
}));

jest.mock('ethers', () => ({
  toUtf8String: jest.fn(),
}));

jest.mock('./utils/beautify-message/beautify-message', () => ({
  beautifySimpleMessage: jest.fn(),
  beautifyComplexMessage: jest.fn(),
}));

jest.mock('./utils/typeguards', () => ({
  isTypedDataV1: jest.fn(),
  isTypedData: jest.fn(),
}));

const mockParseRequestParams = require('./schemas/parse-request-params/parse-request-params').parseRequestParams;
const mockIsTypedDataValid = require('./utils/is-typed-data-valid').isTypedDataValid;
const mockIsTypedDataV1Valid = require('./utils/is-typed-data-valid').isTypedDataV1Valid;
const mockToUtf8 = require('ethers').toUtf8String;
const mockBeautifySimpleMessage = require('./utils/beautify-message/beautify-message').beautifySimpleMessage;
const mockBeautifyComplexMessage = require('./utils/beautify-message/beautify-message').beautifyComplexMessage;
const mockIsTypedDataV1 = require('./utils/typeguards').isTypedDataV1;

const mockRequest = {
  method: RpcMethod.ETH_SIGN,
  params: ['0x123'],
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
  onTransactionPending: jest.fn(),
  onTransactionConfirmed: jest.fn(),
  requestPublicKey: jest.fn(),
  onTransactionReverted: jest.fn(),
};

describe('ethSign', () => {
  beforeEach(() => {
    mockApprovalController.requestApproval.mockResolvedValue({ signedData: '0x1234' });
    mockBeautifySimpleMessage.mockReturnValue('beautified simple message');
    mockBeautifyComplexMessage.mockReturnValue('beautified complex message');
    mockIsTypedDataV1Valid.mockReturnValue({ isValid: true });
  });

  it('should return error when params are invalid', async () => {
    mockParseRequestParams.mockReturnValueOnce({ success: false, error: 'Invalid params' });

    const result = await ethSign({
      request: mockRequest,
      network: mockNetwork,
      approvalController: mockApprovalController,
      blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    expect(result).toEqual({
      success: false,
      error: rpcErrors.invalidParams({ message: 'Params are invalid', data: { cause: 'Invalid params' } }),
    });
  });

  it.each([RpcMethod.SIGN_TYPED_DATA_V3, RpcMethod.SIGN_TYPED_DATA_V4])(
    'should reject the request without prompting for approval when typed data validation is blocking for %s',
    async (method) => {
      mockParseRequestParams.mockReturnValueOnce({
        success: true,
        data: { method, data: {}, address: '0xabc' },
      });
      mockIsTypedDataValid.mockReturnValueOnce({
        isValid: false,
        error: new Error(
          'EIP-712 message contains fields with a type mismatch: message.allowed: expected boolean, got "false"',
        ),
        blocking: true,
      });

      const result = await ethSign({
        request: { ...mockRequest, method },
        network: mockNetwork,
        approvalController: mockApprovalController,
        blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      expect(mockApprovalController.requestApproval).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        error: rpcErrors.invalidParams(
          rpcErrorOpts(
            'EIP-712 message is invalid',
            new Error(
              'EIP-712 message contains fields with a type mismatch: message.allowed: expected boolean, got "false"',
            ),
          ),
        ),
      });
    },
  );

  it.each([RpcMethod.SIGN_TYPED_DATA_V3, RpcMethod.SIGN_TYPED_DATA_V4])(
    'should generate a warning banner for typed data validation failure for %s',
    async (method) => {
      mockParseRequestParams.mockReturnValueOnce({
        success: true,
        data: { method, data: {}, address: '0xabc' },
      });
      mockIsTypedDataValid.mockReturnValueOnce({ isValid: false, error: 'Invalid typed data' });

      await ethSign({
        request: { ...mockRequest, method },
        network: mockNetwork,
        approvalController: mockApprovalController,
        blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      expect(mockApprovalController.requestApproval).toHaveBeenCalledWith(
        expect.objectContaining({
          displayData: expect.objectContaining({
            alert: {
              type: AlertType.INFO,
              details: {
                title: 'Warning: Verify Message Content',
                description: 'This message contains non-standard elements. Please verify message content!',
                detailedDescription: 'Invalid typed data',
              },
            },
          }),
        }),
      );
    },
  );

  it.each([RpcMethod.SIGN_TYPED_DATA, RpcMethod.SIGN_TYPED_DATA_V1])(
    'should reject the request without prompting for approval when V1 typed data validation is blocking for %s',
    async (method) => {
      mockIsTypedDataV1.mockReturnValueOnce(true);
      mockParseRequestParams.mockReturnValueOnce({
        success: true,
        data: { method, data: [{ name: 'allowed', type: 'bool', value: 'false' }], address: '0xabc' },
      });
      mockIsTypedDataV1Valid.mockReturnValueOnce({
        isValid: false,
        error: new Error('Typed data contains fields with a type mismatch: allowed: expected boolean, got "false"'),
        blocking: true,
      });

      const result = await ethSign({
        request: { ...mockRequest, method },
        network: mockNetwork,
        approvalController: mockApprovalController,
        blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      expect(mockApprovalController.requestApproval).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        error: rpcErrors.invalidParams(
          rpcErrorOpts(
            'EIP-712 message is invalid',
            new Error('Typed data contains fields with a type mismatch: allowed: expected boolean, got "false"'),
          ),
        ),
      });
    },
  );

  it.each([
    [RpcMethod.ETH_SIGN, 'data', 'data'],
    [RpcMethod.PERSONAL_SIGN, 'data', 'data in utf8'],
    [RpcMethod.SIGN_TYPED_DATA, 'data', 'beautified simple message'],
    [RpcMethod.SIGN_TYPED_DATA_V1, 'data', 'beautified simple message'],
    [RpcMethod.SIGN_TYPED_DATA_V3, { types: {}, primaryType: '', message: 'test' }, 'beautified complex message'],
    [RpcMethod.SIGN_TYPED_DATA_V4, { types: {}, primaryType: '', message: 'test' }, 'beautified complex message'],
  ])('should generate signingData and displayData for %s', async (method, inputData, expectedMessageDetails) => {
    if (method === RpcMethod.SIGN_TYPED_DATA || method === RpcMethod.SIGN_TYPED_DATA_V1) {
      // isTypedDataV1 is called once for validation and once for display formatting.
      mockIsTypedDataV1.mockReturnValue(true);
    }

    mockParseRequestParams.mockReturnValueOnce({
      success: true,
      data: { method, data: inputData, address: '0xabc' },
    });
    mockIsTypedDataValid.mockReturnValueOnce({ isValid: true });
    mockToUtf8.mockReturnValue('data in utf8');

    await ethSign({
      request: { ...mockRequest, method },
      network: mockNetwork,
      approvalController: mockApprovalController,
      blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    expect(mockApprovalController.requestApproval).toHaveBeenCalledWith({
      displayData: {
        title: 'Sign Message',
        details: [
          {
            title: 'Message',
            items: [
              {
                label: 'Message',
                type: 'text',
                value: expectedMessageDetails,
                alignment: 'vertical',
              },
            ],
          },
        ],
        account: '0xabc',
        banner: undefined,
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
        alert: undefined,
        balanceChange: undefined,
        tokenApprovals: undefined,
      },
      request: { ...mockRequest, method },
      signingData: {
        account: '0xabc',
        data: inputData,
        type: method,
      },
    });
  });

  it('should add alert object with Warning type to displayData when validation result is Warning', async () => {
    await testWithValidationResultType('Warning');
  });

  it('should not add an alert to displayData when validation result is Error', async () => {
    await testWithValidationResultType('Error');
  });

  it('should add alert object with Danger type to displayData when validation result is Malicious', async () => {
    await testWithValidationResultType('Malicious');
  });

  it('should add alert object with Warning type to displayData when schema validation error occurs in jsonRpc scan', async () => {
    const mockBlockaid = {
      evm: {
        jsonRpc: {
          scan: jest.fn().mockRejectedValue({ message: 'schema validation error' }),
        },
      },
    };

    mockParseRequestParams.mockReturnValueOnce({
      success: true,
      data: { method: RpcMethod.ETH_SIGN, data: 'data', address: '0xabc' },
    });

    const result = await ethSign({
      request: mockRequest,
      network: mockNetwork,
      approvalController: mockApprovalController,
      blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    expect(result).toEqual({ result: '0x1234' });
    expect(mockApprovalController.requestApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        displayData: expect.objectContaining({
          alert: {
            type: AlertType.WARNING,
            details: {
              title: 'Suspicious transaction',
              description: 'Use caution, this transaction might be malicious.',
            },
          },
        }),
      }),
    );
  });

  it('should handle success case for approvalController.requestApproval', async () => {
    mockParseRequestParams.mockReturnValueOnce({
      success: true,
      data: { method: RpcMethod.ETH_SIGN, data: 'data', address: '0xabc' },
    });

    const result = await ethSign({
      request: mockRequest,
      network: mockNetwork,
      approvalController: mockApprovalController,
      blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    expect(result).toEqual({ result: '0x1234' });
  });

  it('should handle error case for approvalController.requestApproval', async () => {
    mockParseRequestParams.mockReturnValueOnce({
      success: true,
      data: { method: RpcMethod.ETH_SIGN, data: 'data', address: '0xabc' },
    });
    mockApprovalController.requestApproval.mockResolvedValueOnce({ error: 'User denied message signature' });

    const result = await ethSign({
      request: mockRequest,
      network: mockNetwork,
      approvalController: mockApprovalController,
      blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    expect(result).toEqual({ error: 'User denied message signature' });
  });
});

const testWithValidationResultType = async (resultType: 'Warning' | 'Error' | 'Malicious') => {
  // `result_type === 'Error'` (e.g. an unsupported EIP-712 type Blockaid can't
  // parse) is not a security verdict and must not raise an alert.
  const mockBlockaid = {
    evm: {
      jsonRpc: {
        scan: jest.fn().mockResolvedValue({
          validation: { result_type: resultType },
          simulation: { status: 'Success', account_summary: { exposures: [], assets_diffs: [] } },
        }),
      },
    },
  };

  mockParseRequestParams.mockReturnValueOnce({
    success: true,
    data: { method: RpcMethod.ETH_SIGN, data: 'data', address: '0xabc' },
  });

  const result = await ethSign({
    request: mockRequest,
    network: mockNetwork,
    approvalController: mockApprovalController,
    blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  expect(result).toEqual({ result: '0x1234' });

  if (resultType === 'Malicious') {
    expect(mockApprovalController.requestApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        displayData: expect.objectContaining({
          alert: {
            type: AlertType.DANGER,
            details: {
              title: 'Scam transaction',
              description: 'This transaction has been flagged as malicious, I understand the risk.',
              body: ['This transaction is malicious', 'do not proceed'],
              actionTitles: {
                reject: 'Reject Transaction',
                proceed: 'Proceed Anyway',
              },
            },
          },
        }),
      }),
    );
  } else if (resultType === 'Warning') {
    expect(mockApprovalController.requestApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        displayData: expect.objectContaining({
          alert: {
            type: AlertType.WARNING,
            details: {
              title: 'Suspicious transaction',
              description: 'Use caution, this transaction might be malicious.',
            },
          },
        }),
      }),
    );
  } else {
    expect(mockApprovalController.requestApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        displayData: expect.objectContaining({ alert: undefined }),
      }),
    );
  }
};
