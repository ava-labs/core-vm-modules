import {
  NetworkVMType,
  TokenType,
  type ApprovalController,
  type Network,
  type RpcRequest,
  RpcMethod,
} from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import { deserializeTransactionMessage, type SolanaProvider } from '@avalabs/core-wallets-sdk';

import { getProvider } from '@src/utils/get-provider';
import { SOLANA_MAINNET_CAIP2_ID } from '@src/constants';

import { signTransaction } from './sign-transaction';
import { parseRequestParams } from './schema';
import { ChainId, SolanaCaip2ChainId } from '@avalabs/core-chains-sdk';

jest.mock('@avalabs/core-wallets-sdk');
jest.mock('@internal/utils/src/utils/is-promise-fulfilled');
jest.mock('@src/utils/get-provider');
jest.mock('@src/utils/functional');
jest.mock('./schema');

const mockBlockaid = {
  solana: {
    message: {
      scan: jest.fn(),
    },
  },
};

describe('src/handlers/sign-transaction', () => {
  const mockRequest: RpcRequest = {
    dappInfo: {
      url: 'chrome-extension://test',
      name: 'Test dApp',
      icon: 'test-icon',
    },
    sessionId: 'test-session-id',
    chainId: ChainId.SOLANA_DEVNET_ID.toString(),
    method: RpcMethod.SOLANA_SIGN_TRANSACTION,
    requestId: 'test-request-id',
    params: [
      {
        account: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri', // random address from Solana docs
        serializedTx: 'dGVzdFR4', // base64 for 'testTx'
      },
    ],
  } as const;

  const mockNetwork: Network = {
    isTestnet: true,
    caipId: SolanaCaip2ChainId.DEVNET,
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
    tokens: [
      {
        type: TokenType.SPL,
        contractType: TokenType.SPL,
        address: 'spl-token-address',
        caip2Id: SOLANA_MAINNET_CAIP2_ID,
        symbol: 'USDC',
        decimals: 6,
        name: 'USD Coin',
      },
    ],
  };

  const mockApprovalController = {
    requestApproval: jest.fn(),
  } as unknown as jest.Mocked<ApprovalController>;

  const mockProxyApiUrl = 'https://proxy.api.url';

  const mockProvider = {};

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getProvider).mockReturnValue(mockProvider as unknown as SolanaProvider);
  });

  it('should return error if params are invalid', async () => {
    (parseRequestParams as jest.Mock).mockReturnValue({
      success: false,
      error: 'Invalid params',
    });

    const result = await signTransaction({
      request: mockRequest,
      network: mockNetwork,
      approvalController: mockApprovalController,
      proxyApiUrl: mockProxyApiUrl,
      blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    expect(result).toEqual({
      error: rpcErrors.invalidParams({ message: 'Transaction params are invalid', data: { cause: 'Invalid params' } }),
    });
  });

  it('should return error if no signed data is returned', async () => {
    (parseRequestParams as jest.Mock).mockReturnValue({
      success: true,
      data: [{ account: 'test-account', serializedTx: 'test-serialized-tx' }],
    });
    (getProvider as jest.Mock).mockReturnValue({});
    (deserializeTransactionMessage as jest.Mock).mockResolvedValue({
      instructions: [],
    });
    (mockApprovalController.requestApproval as jest.Mock).mockResolvedValue({});

    const result = await signTransaction({
      request: mockRequest,
      network: mockNetwork,
      approvalController: mockApprovalController,
      proxyApiUrl: mockProxyApiUrl,
      blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    expect(result).toEqual({
      error: rpcErrors.invalidRequest('No signed data returned'),
    });
  });

  it('should return signed data if approval is successful', async () => {
    (parseRequestParams as jest.Mock).mockReturnValue({
      success: true,
      data: [{ account: 'test-account', serializedTx: 'test-serialized-tx' }],
    });
    (getProvider as jest.Mock).mockReturnValue({});
    (deserializeTransactionMessage as jest.Mock).mockResolvedValue({
      instructions: [],
    });
    (mockApprovalController.requestApproval as jest.Mock).mockResolvedValue({
      signedData: 'test-signed-data',
    });

    const result = await signTransaction({
      request: mockRequest,
      network: mockNetwork,
      approvalController: mockApprovalController,
      proxyApiUrl: mockProxyApiUrl,
      blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    expect(result).toEqual({ result: 'test-signed-data' });
  });
});
