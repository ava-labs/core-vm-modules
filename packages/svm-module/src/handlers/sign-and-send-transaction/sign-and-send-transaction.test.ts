import {
  NetworkVMType,
  TokenType,
  type ApprovalController,
  type Network,
  type RpcRequest,
} from '@avalabs/vm-module-types';
import { deserializeTransactionMessage, type SolanaProvider } from '@avalabs/core-wallets-sdk';
import { rpcErrors } from '@metamask/rpc-errors';

import { getProvider } from '@src/utils/get-provider';
import { SOLANA_MAINNET_CAIP2_ID } from '@src/constants';

import { parseRequestParams } from './schema';
import { signAndSendTransaction } from './sign-and-send-transaction';

jest.mock('@avalabs/core-wallets-sdk');
jest.mock('@src/utils/get-provider');
jest.mock('./schema');

describe('src/handlers/sign-and-send-transaction', () => {
  const mockRequest = {
    params: [
      {
        account: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri', // random address from Solana docs
        serializedTx: 'dGVzdFR4', // base64 for 'testTx'
      },
    ],
  } as unknown as RpcRequest;

  const mockNetwork: Network = {
    isTestnet: true,
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

  const mockProvider = {
    sendTransaction: jest.fn(),
  } as unknown as jest.Mocked<SolanaProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getProvider).mockReturnValue(mockProvider as unknown as SolanaProvider);
  });

  it('returns an error if params are invalid', async () => {
    (parseRequestParams as jest.Mock).mockReturnValue({
      success: false,
      error: 'Invalid params',
    });

    const result = await signAndSendTransaction({
      request: mockRequest,
      network: mockNetwork,
      approvalController: mockApprovalController,
      proxyApiUrl: mockProxyApiUrl,
    });

    expect(result).toEqual({
      error: rpcErrors.invalidParams({ message: 'Transaction params are invalid', data: { cause: 'Invalid params' } }),
    });
  });

  it('returns an error if approval request fails', async () => {
    (parseRequestParams as jest.Mock).mockReturnValue({
      success: true,
      data: [{ account: 'test-account', serializedTx: 'test-tx', sendOptions: {} }],
    });
    (deserializeTransactionMessage as jest.Mock).mockResolvedValue({
      instructions: [],
    });
    mockApprovalController.requestApproval.mockResolvedValue({
      error: rpcErrors.internal('Approval error'),
    });

    const result = await signAndSendTransaction({
      request: mockRequest,
      network: mockNetwork,
      approvalController: mockApprovalController,
      proxyApiUrl: mockProxyApiUrl,
    });

    expect(result).toEqual({
      error: rpcErrors.internal('Approval error'),
    });
  });

  it('returns an error if unable to dispatch transaction', async () => {
    (parseRequestParams as jest.Mock).mockReturnValue({
      success: true,
      data: [{ account: 'test-account', serializedTx: 'test-tx', sendOptions: {} }],
    });
    (getProvider as jest.Mock).mockReturnValue({});
    (deserializeTransactionMessage as jest.Mock).mockResolvedValue({
      instructions: [],
    });
    mockApprovalController.requestApproval.mockResolvedValue({
      signedData: 'signed-data',
    });
    mockProvider.sendTransaction.mockReturnValue({
      send: jest.fn().mockRejectedValue(new Error('Transaction error')),
    });

    const result = await signAndSendTransaction({
      request: mockRequest,
      network: mockNetwork,
      approvalController: mockApprovalController,
      proxyApiUrl: mockProxyApiUrl,
    });

    expect(result).toEqual({
      error: rpcErrors.internal({
        message: 'Unable to get transaction hash',
        data: { cause: new Error('Transaction error') },
      }),
    });
  });

  it('returns the transaction hash on success', async () => {
    (parseRequestParams as jest.Mock).mockReturnValue({
      success: true,
      data: [{ account: 'test-account', serializedTx: 'test-tx', sendOptions: {} }],
    });
    mockProvider.sendTransaction.mockReturnValue({
      send: jest.fn().mockResolvedValue('tx-hash'),
    });
    (deserializeTransactionMessage as jest.Mock).mockResolvedValue({
      instructions: [],
    });
    mockApprovalController.requestApproval.mockResolvedValue({
      signedData: 'signed-data',
    });

    const result = await signAndSendTransaction({
      request: mockRequest,
      network: mockNetwork,
      approvalController: mockApprovalController,
      proxyApiUrl: mockProxyApiUrl,
    });

    expect(result).toEqual({
      result: 'tx-hash',
    });
  });

  it('uses optional send options when provided', async () => {
    const sendOptions = { maxRetries: 3n };
    (parseRequestParams as jest.Mock).mockReturnValue({
      success: true,
      data: [{ account: 'test-account', serializedTx: 'test-tx', sendOptions }],
    });
    mockProvider.sendTransaction.mockReturnValue({
      send: jest.fn().mockResolvedValue('tx-hash'),
    });
    (deserializeTransactionMessage as jest.Mock).mockResolvedValue({
      instructions: [],
    });
    mockApprovalController.requestApproval.mockResolvedValue({
      signedData: 'signed-data',
    });

    const result = await signAndSendTransaction({
      request: {
        params: [
          {
            account: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri', // random address from Solana docs
            serializedTx: 'dGVzdFR4', // base64 for 'testTx'
            sendOptions,
          },
        ],
      } as unknown as RpcRequest,
      network: mockNetwork,
      approvalController: mockApprovalController,
      proxyApiUrl: mockProxyApiUrl,
    });

    expect(mockProvider.sendTransaction).toHaveBeenCalledWith('signed-data', {
      encoding: 'base64',
      ...sendOptions,
    });

    expect(result).toEqual({
      result: 'tx-hash',
    });
  });
});
