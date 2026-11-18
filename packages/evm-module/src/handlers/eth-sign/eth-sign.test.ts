import { ethSign } from './eth-sign';
import { AlertType, NetworkVMType, RpcMethod } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import { rpcErrorOpts } from '@internal/utils';
import { resolveAgentIdentity } from '../../utils/resolve-agent-identity';

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
  ...jest.requireActual('ethers'),
  toUtf8String: jest.fn(),
}));

jest.mock('./utils/beautify-message/beautify-message', () => ({
  beautifySimpleMessage: jest.fn(),
  beautifyComplexMessage: jest.fn(),
}));

jest.mock('../../utils/resolve-agent-identity', () => ({
  resolveAgentIdentity: jest.fn(),
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
const mockIsTypedData = require('./utils/typeguards').isTypedData;
const mockResolveAgentIdentity = resolveAgentIdentity as jest.MockedFunction<typeof resolveAgentIdentity>;

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
  customRpcHeaders: undefined,
  networkToken: {
    name: 'ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
  vmName: NetworkVMType.EVM,
};

const testAgentIdentity = {
  agentId: '1599',
  agentRegistry: 'eip155:43114:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
  owner: '0x1234567890123456789012345678901234567890',
  reputationScore: 88,
  metadataUri: 'ipfs://agent.json',
  trustLevel: 'high' as const,
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
    mockResolveAgentIdentity.mockResolvedValue(testAgentIdentity);
  });

  it('threads resolved agent identity into sign approval display data', async () => {
    mockParseRequestParams.mockReturnValueOnce({
      success: true,
      data: { method: RpcMethod.ETH_SIGN, data: 'data', address: '0xabc' },
    });

    await ethSign({
      request: {
        ...mockRequest,
        context: {
          agentIdentity: {
            agentId: '1599',
            agentRegistry: 'eip155:43114:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
          },
        },
      },
      network: mockNetwork,
      approvalController: mockApprovalController,
      blockaid: mockBlockaid as never,
    });

    expect(mockResolveAgentIdentity).toHaveBeenCalledWith({
      declaration: {
        agentId: '1599',
        agentRegistry: 'eip155:43114:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
      },
      rpcUrl: mockNetwork.rpcUrl,
      chainId: mockNetwork.chainId,
      chainName: mockNetwork.chainName,
      customRpcHeaders: mockNetwork.customRpcHeaders,
    });
    expect(mockApprovalController.requestApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        displayData: expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              title: 'Agent Identity',
              items: expect.arrayContaining([
                expect.objectContaining({ label: 'Agent ID', value: testAgentIdentity.agentId }),
                expect.objectContaining({ label: 'Registry', value: testAgentIdentity.agentRegistry }),
                expect.objectContaining({ label: 'Trust level', value: testAgentIdentity.trustLevel }),
              ]),
            }),
          ]),
        }),
      }),
    );
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
    'should validate typed data against the requested network chainId for %s',
    async (method) => {
      const typedData = { types: { EIP712Domain: [] }, primaryType: 'Foo', domain: {}, message: {} };

      mockParseRequestParams.mockReturnValueOnce({
        success: true,
        data: { method, data: typedData, address: '0xabc' },
      });
      mockIsTypedDataValid.mockReturnValueOnce({ isValid: true });

      await ethSign({
        request: { ...mockRequest, method },
        network: mockNetwork,
        approvalController: mockApprovalController,
        blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      expect(mockIsTypedDataValid).toHaveBeenCalledWith(typedData, mockNetwork.chainId);
    },
  );

  it('should validate legacy typed data objects against the requested network chainId', async () => {
    const typedData = { types: { EIP712Domain: [] }, primaryType: 'Foo', domain: {}, message: {} };

    mockParseRequestParams.mockReturnValueOnce({
      success: true,
      data: { method: RpcMethod.SIGN_TYPED_DATA, data: typedData, address: '0xabc' },
    });
    mockIsTypedDataV1.mockReturnValueOnce(false).mockReturnValueOnce(false);
    mockIsTypedData.mockReturnValueOnce(true).mockReturnValueOnce(true);
    mockIsTypedDataValid.mockReturnValueOnce({ isValid: true });

    await ethSign({
      request: { ...mockRequest, method: RpcMethod.SIGN_TYPED_DATA },
      network: mockNetwork,
      approvalController: mockApprovalController,
      blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    expect(mockIsTypedDataValid).toHaveBeenCalledWith(typedData, mockNetwork.chainId);
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

  it.each([RpcMethod.SIGN_TYPED_DATA_V3, RpcMethod.SIGN_TYPED_DATA_V4])(
    'should display only the fields covered by the signature for %s',
    async (method) => {
      const typedData = {
        types: {
          EIP712Domain: [{ name: 'name', type: 'string' }],
          Permit: [{ name: 'spender', type: 'address' }],
        },
        primaryType: 'Permit',
        domain: { name: 'dApp' },
        // `dailyLimit` is not declared in the Permit type, so it is not signed and must not
        // be shown as if it were.
        message: { spender: `0x${'11'.repeat(20)}`, dailyLimit: '0.01 ETH' },
      };

      mockParseRequestParams.mockReturnValueOnce({
        success: true,
        data: { method, data: typedData, address: '0xabc' },
      });

      await ethSign({
        request: { ...mockRequest, method },
        network: mockNetwork,
        approvalController: mockApprovalController,
        blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      expect(mockBeautifyComplexMessage).toHaveBeenCalledWith({
        domain: typedData.domain,
        message: { spender: typedData.message.spender },
      });
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

  it('should fall back to the raw payload when a personal_sign message is not valid UTF-8', async () => {
    mockParseRequestParams.mockReturnValueOnce({
      success: true,
      data: { method: RpcMethod.PERSONAL_SIGN, data: '0xdeadbeef', address: '0xabc' },
    });
    mockToUtf8.mockImplementationOnce(() => {
      throw new Error('invalid codepoint');
    });

    const result = await ethSign({
      request: { ...mockRequest, method: RpcMethod.PERSONAL_SIGN },
      network: mockNetwork,
      approvalController: mockApprovalController,
      blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    // Signable either way, so the request must not blow up in the handler.
    expect(result).toEqual({ result: '0x1234' });
    expect(mockApprovalController.requestApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        displayData: expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({ items: [expect.objectContaining({ value: '0xdeadbeef' })] }),
          ]),
        }),
      }),
    );
  });

  it.each([
    [RpcMethod.ETH_SIGN, 'data', 'data'],
    // Hex payload: plain text is displayed as is, without hex decoding.
    [RpcMethod.PERSONAL_SIGN, '0x64617461', 'data in utf8'],
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

describe('ethSign SIWE domain check', () => {
  const actualEthers = jest.requireActual('ethers');
  const siweMessage = (domain: string) => `${domain} wants you to sign in with your Ethereum account:
0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2

Sign in to the app

URI: https://${domain}/login
Version: 1
Chain ID: 1
Nonce: abc12345
Issued At: 2021-09-30T16:25:24Z`;
  const toHex = (text: string): string => actualEthers.hexlify(actualEthers.toUtf8Bytes(text));
  const siweMismatchAlert = expect.objectContaining({
    type: AlertType.DANGER,
    details: expect.objectContaining({
      title: 'Sign-In Request Mismatch',
      description: expect.stringContaining('Domain "evil.com" doesn\'t match the dApp origin "example.com".'),
    }),
  });

  const runPersonalSign = async ({
    data,
    dappUrl = 'https://example.com',
    blockaid = mockBlockaid,
    method = RpcMethod.PERSONAL_SIGN,
  }: {
    data: unknown;
    dappUrl?: string;
    blockaid?: unknown;
    method?: RpcMethod;
  }) => {
    mockParseRequestParams.mockReturnValueOnce({ success: true, data: { method, data, address: '0xabc' } });

    const result = await ethSign({
      request: { ...mockRequest, method, dappInfo: { ...mockRequest.dappInfo, url: dappUrl } },
      network: mockNetwork,
      approvalController: mockApprovalController,
      blockaid: blockaid as never,
    });

    return { result, displayData: mockApprovalController.requestApproval.mock.calls[0]?.[0]?.displayData };
  };

  const blockaidWith = (resultType: 'Benign' | 'Warning' | 'Malicious') => ({
    evm: { jsonRpc: { scan: jest.fn().mockResolvedValue({ validation: { result_type: resultType } }) } },
  });

  beforeEach(() => {
    mockApprovalController.requestApproval.mockResolvedValue({ signedData: '0x1234' });
    mockToUtf8.mockImplementation(actualEthers.toUtf8String);
    mockResolveAgentIdentity.mockResolvedValue(undefined as never);
  });

  it.each([
    ['hex', toHex(siweMessage('evil.com'))],
    ['plain text', siweMessage('evil.com')],
  ])('adds a DANGER alert when a %s SIWE message domain does not match the dApp origin', async (_encoding, data) => {
    const { result, displayData } = await runPersonalSign({ data });

    expect(result).toEqual({ result: '0x1234' });
    expect(displayData.alert).toEqual(siweMismatchAlert);
    // The message shown to the user is the same decoded text the SIWE check parsed.
    expect(displayData.details[0].items[0].value).toBe(siweMessage('evil.com'));
  });

  it('does not add an alert when the SIWE domain matches the dApp origin', async () => {
    const { displayData } = await runPersonalSign({
      data: toHex(siweMessage('example.com')),
      dappUrl: 'https://example.com/app',
    });

    expect(displayData.alert).toBeUndefined();
  });

  it('does not add an alert for a regular personal_sign message', async () => {
    const { displayData } = await runPersonalSign({ data: toHex('Hello world') });

    expect(displayData.alert).toBeUndefined();
  });

  it.each(['', 'not a url'])(
    'does not add an alert or crash when the dApp URL is missing or unparseable (%p)',
    async (dappUrl) => {
      const { result, displayData } = await runPersonalSign({ data: siweMessage('evil.com'), dappUrl });

      expect(result).toEqual({ result: '0x1234' });
      expect(displayData.alert).toBeUndefined();
    },
  );

  it('flags a malformed SIWE message', async () => {
    const smuggled = siweMessage('example.com').replace(
      'Sign in to the app\n',
      'Sign in to the app\n\nURI: https://evil.com\n',
    );
    const { displayData } = await runPersonalSign({ data: smuggled });

    expect(displayData.alert).toEqual(
      expect.objectContaining({
        type: AlertType.DANGER,
        details: expect.objectContaining({ title: 'Malformed Sign-In Request' }),
      }),
    );
  });

  it('keeps the Blockaid alert when it is as severe as the SIWE alert and adds the SIWE reason to it', async () => {
    const { displayData } = await runPersonalSign({
      data: siweMessage('evil.com'),
      blockaid: blockaidWith('Malicious'),
    });

    expect(displayData.alert.type).toBe(AlertType.DANGER);
    expect(displayData.alert.details.title).toBe('Scam transaction');
    expect(displayData.alert.details.body).toEqual([
      'This transaction is malicious',
      'do not proceed',
      expect.stringMatching(/^Sign-In Request Mismatch: Domain "evil.com" doesn't match/),
    ]);
  });

  it('leads with the SIWE alert over a less severe Blockaid warning without dropping the warning', async () => {
    const { displayData } = await runPersonalSign({ data: siweMessage('evil.com'), blockaid: blockaidWith('Warning') });

    expect(displayData.alert.type).toBe(AlertType.DANGER);
    expect(displayData.alert.details.title).toBe('Sign-In Request Mismatch');
    expect(displayData.alert.details.body).toEqual([
      'Suspicious transaction: Use caution, this transaction might be malicious.',
    ]);
  });

  it('keeps the Blockaid alert untouched when the SIWE domain matches', async () => {
    const { displayData } = await runPersonalSign({
      data: siweMessage('example.com'),
      blockaid: blockaidWith('Warning'),
    });

    expect(displayData.alert).toEqual({
      type: AlertType.WARNING,
      details: { title: 'Suspicious transaction', description: 'Use caution, this transaction might be malicious.' },
    });
  });

  it.each([RpcMethod.ETH_SIGN, RpcMethod.SIGN_TYPED_DATA_V4])('does not run the SIWE check for %s', async (method) => {
    mockIsTypedDataValid.mockReturnValueOnce({ isValid: true });
    const data =
      method === RpcMethod.ETH_SIGN
        ? siweMessage('evil.com')
        : { types: {}, primaryType: 'Mail', domain: {}, message: { contents: siweMessage('evil.com') } };

    const { displayData } = await runPersonalSign({ data, method });

    expect(displayData.alert).toBeUndefined();
  });
});
