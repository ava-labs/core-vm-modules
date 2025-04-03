import {
  NetworkVMType,
  type ApprovalController,
  type Network,
  type RpcRequest,
  RpcMethod,
} from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import { ChainId, SolanaCaip2ChainId } from '@avalabs/core-chains-sdk';

import { signMessage } from './sign-message';
import { parseRequestParams } from './schema';

jest.mock('./schema');

describe('src/handlers/sign-message', () => {
  const mockRequest: RpcRequest = {
    dappInfo: {
      url: 'chrome-extension://test',
      name: 'Test dApp',
      icon: 'test-icon',
    },
    sessionId: 'test-session-id',
    chainId: ChainId.SOLANA_MAINNET_ID.toString(),
    method: RpcMethod.SOLANA_SIGN_MESSAGE,
    requestId: 'test-request-id',
    params: [
      {
        account: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri', // random address from Solana docs
        serializedMessage: 'dGVzdFR4', // base64 for 'testTx'
      },
    ],
  } as const;

  const mockNetwork: Network = {
    isTestnet: true,
    caipId: SolanaCaip2ChainId.MAINNET,
    rpcUrl: 'https://rpc.url/',
    vmName: NetworkVMType.SVM,
    chainId: 1234,
    chainName: 'Solana',
    logoUri: 'test-logo-uri',
    networkToken: {
      symbol: 'SOL',
      decimals: 9,
      name: 'SOL',
    },
  };

  const mockApprovalController = {
    requestApproval: jest.fn(),
  } as unknown as jest.Mocked<ApprovalController>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error if params are invalid', async () => {
    (parseRequestParams as jest.Mock).mockReturnValue({
      success: false,
      error: 'Invalid params',
    });

    const result = await signMessage({
      request: mockRequest,
      network: mockNetwork,
      approvalController: mockApprovalController,
    });

    expect(result).toEqual({
      error: rpcErrors.invalidParams({
        message: 'Message signing params are invalid',
        data: { cause: 'Invalid params' },
      }),
    });
  });

  it('should return error if no signed data is returned', async () => {
    (parseRequestParams as jest.Mock).mockReturnValue({
      success: true,
      data: [{ account: 'test-account', serializedMessage: 'dGVzdFR4' }],
    });
    (mockApprovalController.requestApproval as jest.Mock).mockResolvedValue({});

    const result = await signMessage({
      request: mockRequest,
      network: mockNetwork,
      approvalController: mockApprovalController,
    });

    expect(result).toEqual({
      error: rpcErrors.invalidRequest('No signed data returned'),
    });
  });

  it('should return signed data if approval is successful', async () => {
    (parseRequestParams as jest.Mock).mockReturnValue({
      success: true,
      data: [{ account: 'test-account', serializedMessage: 'dGVzdFR4' }],
    });
    (mockApprovalController.requestApproval as jest.Mock).mockResolvedValue({
      signedData: 'test-signed-data',
    });

    const result = await signMessage({
      request: mockRequest,
      network: mockNetwork,
      approvalController: mockApprovalController,
    });

    expect(result).toEqual({ result: 'test-signed-data' });
  });
});
