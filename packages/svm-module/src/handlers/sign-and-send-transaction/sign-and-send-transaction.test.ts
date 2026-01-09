import {
  NetworkVMType,
  TokenType,
  type ApprovalController,
  type Network,
  type RpcRequest,
  RpcMethod,
} from '@avalabs/vm-module-types';
import { deserializeTransactionMessage, type SolanaProvider } from '@avalabs/core-wallets-sdk';
import { rpcErrors } from '@metamask/rpc-errors';

import { getProvider } from '@src/utils/get-provider';
import { SOLANA_MAINNET_CAIP2_ID } from '@src/constants';
import { waitForTransactionConfirmation } from '@src/utils/wait-for-transaction-confirmation';

import { parseRequestParams } from './schema';
import { signAndSendTransaction } from './sign-and-send-transaction';
import { ChainId, SolanaCaip2ChainId } from '@avalabs/core-chains-sdk';

const mockBlockaid = {
  solana: {
    message: {
      scan: jest.fn(),
    },
  },
};

jest.mock('@avalabs/core-wallets-sdk');
jest.mock('@src/utils/get-provider');
jest.mock('./schema');
jest.mock('@src/utils/wait-for-transaction-confirmation');
jest.mock('@src/utils/explain/explain-transaction', () => ({
  explainTransaction: jest.fn().mockResolvedValue({
    details: [],
    isSimulationSuccessful: true,
    alert: null,
    balanceChange: { ins: [], outs: [] },
  }),
}));

describe('src/handlers/sign-and-send-transaction', () => {
  const mockRequest: RpcRequest = {
    dappInfo: {
      url: 'chrome-extension://test',
      name: 'Test dApp',
      icon: 'test-icon',
    },
    sessionId: 'test-session-id',
    chainId: ChainId.SOLANA_DEVNET_ID.toString(),
    method: RpcMethod.SOLANA_SIGN_AND_SEND_TRANSACTION,
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
    rpcUrl: 'https://rpc.url/',
    vmName: NetworkVMType.SVM,
    chainId: 1234,
    chainName: 'Solana',
    explorerUrl: 'https://explorer.solana.com',
    caipId: SolanaCaip2ChainId.DEVNET,
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
  let mockApprovalController: jest.Mocked<ApprovalController>;

  const mockProxyApiUrl = 'https://proxy.api.url';

  const mockProvider = {
    sendTransaction: jest.fn(),
  } as unknown as jest.Mocked<SolanaProvider>;

  const base58TxHash = '5KKsT9B7J3v3N6TKwHnb6THwo8E2Xe7t';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getProvider).mockReturnValue(mockProvider as unknown as SolanaProvider);

    mockApprovalController = {
      requestApproval: jest.fn().mockResolvedValue({
        signedData: 'signed-data',
      }),
      onTransactionPending: jest.fn(),
      onTransactionConfirmed: jest.fn(),
      onTransactionReverted: jest.fn(),
      requestPublicKey: jest.fn(),
    } as unknown as jest.Mocked<ApprovalController>;

    // Mock the base64 transaction to be valid
    (parseRequestParams as jest.Mock).mockReturnValue({
      success: true,
      data: [
        {
          account: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri', // Valid Solana address
          serializedTx: 'AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', // Valid empty Solana transaction
          sendOptions: { maxRetries: BigInt(3) },
        },
      ],
    });
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
      blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
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
      blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
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
      blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    expect(result).toEqual({
      error: rpcErrors.internal({
        message: 'Transaction failed',
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
      send: jest.fn().mockResolvedValue(base58TxHash),
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
      blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    expect(result).toEqual({
      result: base58TxHash,
    });
  });

  it('uses optional send options when provided', async () => {
    const sendOptions = { maxRetries: 3n };
    (parseRequestParams as jest.Mock).mockReturnValue({
      success: true,
      data: [{ account: 'test-account', serializedTx: 'test-tx', sendOptions }],
    });
    mockProvider.sendTransaction.mockReturnValue({
      send: jest.fn().mockResolvedValue(base58TxHash),
    });
    (deserializeTransactionMessage as jest.Mock).mockResolvedValue({
      instructions: [],
    });
    mockApprovalController.requestApproval.mockResolvedValue({
      signedData: 'signed-data',
    });

    const result = await signAndSendTransaction({
      request: {
        dappInfo: {
          url: 'chrome-extension://test',
        },
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
      blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    expect(mockProvider.sendTransaction).toHaveBeenCalledWith('signed-data', {
      encoding: 'base64',
      maxRetries: 3n,
    });

    expect(result).toEqual({
      result: base58TxHash,
    });
  });

  it('handles successful transaction confirmation', async () => {
    (parseRequestParams as jest.Mock).mockReturnValue({
      success: true,
      data: [{ account: 'test-account', serializedTx: 'test-tx', sendOptions: {} }],
    });
    mockProvider.sendTransaction.mockReturnValue({
      send: jest.fn().mockResolvedValue(base58TxHash),
    });
    (deserializeTransactionMessage as jest.Mock).mockResolvedValue({
      instructions: [],
    });
    mockApprovalController.requestApproval.mockResolvedValue({
      signedData: 'signed-data',
    });
    mockApprovalController.onTransactionPending = jest.fn().mockResolvedValue(undefined);

    const result = await signAndSendTransaction({
      request: mockRequest,
      network: mockNetwork,
      approvalController: mockApprovalController,
      proxyApiUrl: mockProxyApiUrl,
      blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    expect(mockApprovalController.onTransactionPending).toHaveBeenCalledWith({
      txHash: base58TxHash,
      request: mockRequest,
      explorerLink: 'https://explorer.solana.com/tx/' + base58TxHash,
    });
    expect(waitForTransactionConfirmation).toHaveBeenCalledWith({
      provider: mockProvider,
      txHash: base58TxHash,
      approvalController: mockApprovalController,
      request: mockRequest,
      network: mockNetwork,
      commitment: undefined,
    });
    expect(result).toEqual({ result: base58TxHash });
  });

  it('handles transaction confirmation failure', async () => {
    (parseRequestParams as jest.Mock).mockReturnValue({
      success: true,
      data: [{ account: 'test-account', serializedTx: 'test-tx', sendOptions: {} }],
    });
    mockProvider.sendTransaction.mockReturnValue({
      send: jest.fn().mockResolvedValue(base58TxHash),
    });
    (deserializeTransactionMessage as jest.Mock).mockResolvedValue({
      instructions: [],
    });
    mockApprovalController.requestApproval.mockResolvedValue({
      signedData: 'signed-data',
    });
    mockApprovalController.onTransactionPending = jest.fn().mockResolvedValue(undefined);

    const result = await signAndSendTransaction({
      request: mockRequest,
      network: mockNetwork,
      approvalController: mockApprovalController,
      proxyApiUrl: mockProxyApiUrl,
      blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    expect(result).toEqual({ result: base58TxHash });
  });

  it('uses commitment level from send options for confirmation', async () => {
    const sendOptions = { preflightCommitment: 'confirmed' as const };
    (parseRequestParams as jest.Mock).mockReturnValue({
      success: true,
      data: [{ account: 'test-account', serializedTx: 'test-tx', sendOptions }],
    });
    mockProvider.sendTransaction.mockReturnValue({
      send: jest.fn().mockResolvedValue(base58TxHash),
    });
    (deserializeTransactionMessage as jest.Mock).mockResolvedValue({
      instructions: [],
    });
    mockApprovalController.requestApproval.mockResolvedValue({
      signedData: 'signed-data',
    });
    mockApprovalController.onTransactionPending = jest.fn().mockResolvedValue(undefined);

    const result = await signAndSendTransaction({
      request: mockRequest,
      network: mockNetwork,
      approvalController: mockApprovalController,
      proxyApiUrl: mockProxyApiUrl,
      blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    expect(waitForTransactionConfirmation).toHaveBeenCalledWith({
      provider: mockProvider,
      txHash: base58TxHash,
      approvalController: mockApprovalController,
      request: mockRequest,
      commitment: 'confirmed',
      network: mockNetwork,
    });
    expect(result).toEqual({ result: base58TxHash });
  });
});
