import { ethSign } from './eth-sign';
import { AlertType, RpcMethod } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import Blockaid from '@blockaid/client';

const PROXY_API_URL = 'https://proxy-api.avax.network';

jest.mock('@blockaid/client', () => {
  return jest.fn().mockImplementation(() => {
    return {
      evm: {
        transaction: {
          scan: jest.fn().mockResolvedValue({ validation: { result_type: 'Benign' } }),
        },
        jsonRpc: {
          scan: jest.fn().mockResolvedValue({ validation: { result_type: 'Benign' } }),
        },
      },
    };
  });
});

jest.mock('./schemas/parse-request-params/parse-request-params', () => ({
  parseRequestParams: jest.fn(),
}));

jest.mock('./utils/is-typed-data-valid', () => ({
  isTypedDataValid: jest.fn(),
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
};

const mockApprovalController = {
  requestApproval: jest.fn(),
  onTransactionConfirmed: jest.fn(),
  onTransactionReverted: jest.fn(),
};

describe('ethSign', () => {
  beforeEach(() => {
    mockApprovalController.requestApproval.mockResolvedValue({ result: '0x1234' });
    mockBeautifySimpleMessage.mockReturnValue('beautified simple message');
    mockBeautifyComplexMessage.mockReturnValue('beautified complex message');
  });

  it('should return error when params are invalid', async () => {
    mockParseRequestParams.mockReturnValueOnce({ success: false, error: 'Invalid params' });

    const result = await ethSign({
      request: mockRequest,
      network: mockNetwork,
      approvalController: mockApprovalController,
      proxyApiUrl: PROXY_API_URL,
    });

    expect(result).toEqual({
      success: false,
      error: rpcErrors.invalidParams('Params are invalid'),
    });
  });

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
        proxyApiUrl: PROXY_API_URL,
      });

      expect(mockApprovalController.requestApproval).toHaveBeenCalledWith(
        expect.objectContaining({
          displayData: expect.objectContaining({
            alert: {
              type: AlertType.INFO,
              details: {
                title: 'Warning: Verify Message Content',
                description: 'This message contains non-standard elements.',
                detailedDescription: 'Invalid typed data',
              },
            },
          }),
        }),
      );
    },
  );

  it.each([
    [
      RpcMethod.ETH_SIGN,
      'data',
      'data',
      "Signing this message can be dangerous. This signature could potentially perform any operation on your account's behalf, including granting complete control of your account and all of its assets to the requesting site. Only sign this message if you know what you're doing or completely trust the requesting site",
    ],
    [RpcMethod.PERSONAL_SIGN, 'data', 'data in utf8', undefined],
    [RpcMethod.SIGN_TYPED_DATA, 'data', 'beautified simple message', undefined],
    [RpcMethod.SIGN_TYPED_DATA_V1, 'data', 'beautified simple message', undefined],
    [
      RpcMethod.SIGN_TYPED_DATA_V3,
      { types: {}, primaryType: '', message: 'test' },
      'beautified complex message',
      undefined,
    ],
    [
      RpcMethod.SIGN_TYPED_DATA_V4,
      { types: {}, primaryType: '', message: 'test' },
      'beautified complex message',
      undefined,
    ],
  ])(
    'should generate signingData and displayData for %s',
    async (method, inputData, expectedMessageDetails, expectedDisclaimer) => {
      if (method === RpcMethod.SIGN_TYPED_DATA || method === RpcMethod.SIGN_TYPED_DATA_V1) {
        mockIsTypedDataV1.mockReturnValueOnce(true);
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
        proxyApiUrl: PROXY_API_URL,
      });

      expect(mockApprovalController.requestApproval).toHaveBeenCalledWith({
        displayData: {
          title: 'Sign Message',
          messageDetails: expectedMessageDetails,
          account: '0xabc',
          banner: undefined,
          dAppInfo: {
            action: 'Test DApp requests you to sign the following message',
            logoUri: 'test-icon-uri',
            name: 'Test DApp',
          },
          disclaimer: expectedDisclaimer,
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
          chainId: 1,
          data: inputData,
          type: method,
        },
      });
    },
  );

  it('should add alert object with Warning type to displayData when validation result is Warning', async () => {
    testWithValidationResultType('Warning');
  });

  it('should add alert object with Warning type to displayData when validation result is Error', async () => {
    testWithValidationResultType('Error');
  });

  it('should add alert object with Danger type to displayData when validation result is Malicious', async () => {
    testWithValidationResultType('Malicious');
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
      proxyApiUrl: PROXY_API_URL,
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
      proxyApiUrl: PROXY_API_URL,
    });

    expect(result).toEqual({ error: 'User denied message signature' });
  });
});

const testWithValidationResultType = async (resultType: 'Warning' | 'Error' | 'Malicious') => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Blockaid as any).mockImplementation(() => ({
    evm: {
      jsonRpc: {
        scan: jest.fn().mockResolvedValue({
          validation: { result_type: resultType },
          simulation: { status: 'Success', account_summary: { exposures: [], assets_diffs: [] } },
        }),
      },
    },
  }));

  mockParseRequestParams.mockReturnValueOnce({
    success: true,
    data: { method: RpcMethod.ETH_SIGN, data: 'data', address: '0xabc' },
  });

  const result = await ethSign({
    request: mockRequest,
    network: mockNetwork,
    approvalController: mockApprovalController,
    proxyApiUrl: PROXY_API_URL,
  });

  expect(result).toEqual({ result: '0x1234' });

  if (resultType === 'Malicious') {
    expect(mockApprovalController.requestApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        displayData: expect.objectContaining({
          alert: {
            type: AlertType.DANGER,
            details: {
              title: 'Scam Transaction',
              description: 'This transaction is malicious, do not proceed.',
              actionTitles: {
                reject: 'Reject Transaction',
                proceed: 'Proceed Anyway',
              },
            },
          },
        }),
      }),
    );
  } else {
    expect(mockApprovalController.requestApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        displayData: expect.objectContaining({
          alert: {
            type: AlertType.WARNING,
            details: {
              title: 'Suspicious Transaction',
              description: 'Use caution, this transaction may be malicious.',
            },
          },
        }),
      }),
    );
  }
};
