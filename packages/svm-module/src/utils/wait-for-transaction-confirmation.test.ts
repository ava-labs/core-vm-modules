import { NetworkVMType, RpcMethod, type Network, type RpcRequest } from '@avalabs/vm-module-types';
import type { getProvider } from './get-provider';

import { waitForTransactionConfirmation } from './wait-for-transaction-confirmation';

jest.mock('@solana/kit', () => ({
  signature: jest.fn((sig) => sig),
}));

describe('waitForTransactionConfirmation', () => {
  const mockTxHash = '0xd0f608d667c54f5dae47e002c8255e777a078f333d9363' as const;
  const mockRequest: RpcRequest = {
    requestId: 'request-1',
    sessionId: 'session-1',
    method: RpcMethod.SOLANA_SIGN_AND_SEND_TRANSACTION,
    chainId: '245022934',
    params: {},
    dappInfo: {
      name: 'Test dApp',
      url: 'https://test.com',
      icon: 'https://test.com/icon.png',
    },
  };

  const mockNetwork: Network = {
    chainId: 245022934,
    chainName: 'Solana',
    logoUri: 'test-logo-uri',
    explorerUrl: 'https://explorer.solana.com',
    networkToken: {
      symbol: 'SOL',
      decimals: 9,
      name: 'SOL',
    },
    vmName: NetworkVMType.SVM,
    isTestnet: false,
    rpcUrl: 'https://api.mainnet-beta.solana.com',
  };

  let provider: jest.Mocked<ReturnType<typeof getProvider>>;
  let approvalController: {
    onTransactionConfirmed: jest.Mock;
    onTransactionReverted: jest.Mock;
    onTransactionPending: jest.Mock;
    requestApproval: jest.Mock;
    requestPublicKey: jest.Mock;
  };

  beforeEach(() => {
    jest.useFakeTimers();

    provider = {
      getSignatureStatuses: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    approvalController = {
      onTransactionConfirmed: jest.fn().mockResolvedValue(undefined),
      onTransactionReverted: jest.fn().mockResolvedValue(undefined),
      onTransactionPending: jest.fn().mockResolvedValue(undefined),
      requestApproval: jest.fn().mockResolvedValue(undefined),
      requestPublicKey: jest.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should confirm transaction when status is finalized', async () => {
    const sendMock = jest.fn().mockResolvedValue({
      value: [
        {
          confirmationStatus: 'finalized',
          err: null,
        },
      ],
    });
    provider.getSignatureStatuses.mockReturnValue({ send: sendMock });

    const resultPromise = waitForTransactionConfirmation({
      provider,
      txHash: mockTxHash,
      approvalController,
      request: mockRequest,
      network: mockNetwork,
    });

    await jest.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toBe(true);
    expect(approvalController.onTransactionConfirmed).toHaveBeenCalledWith({
      txHash: mockTxHash,
      request: mockRequest,
      explorerLink: new URL(`/tx/${mockTxHash}`, mockNetwork.explorerUrl).toString(),
    });
  });

  it('should confirm transaction at specified commitment level', async () => {
    const sendMock = jest.fn().mockResolvedValue({
      value: [
        {
          confirmationStatus: 'confirmed',
          err: null,
        },
      ],
    });
    provider.getSignatureStatuses.mockReturnValue({ send: sendMock });

    const resultPromise = waitForTransactionConfirmation({
      provider,
      txHash: mockTxHash,
      approvalController,
      request: mockRequest,
      network: mockNetwork,
      commitment: 'confirmed',
    });

    await jest.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toBe(true);
    expect(approvalController.onTransactionConfirmed).toHaveBeenCalledWith({
      txHash: mockTxHash,
      request: mockRequest,
      explorerLink: new URL(`/tx/${mockTxHash}`, mockNetwork.explorerUrl).toString(),
    });
  });

  it('should handle transaction errors', async () => {
    const sendMock = jest.fn().mockResolvedValue({
      value: [
        {
          confirmationStatus: 'processed',
          err: { InstructionError: [0, 'Test error'] },
        },
      ],
    });
    provider.getSignatureStatuses.mockReturnValue({ send: sendMock });

    const resultPromise = waitForTransactionConfirmation({
      provider,
      txHash: mockTxHash,
      approvalController,
      request: mockRequest,
      network: mockNetwork,
    });

    await jest.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toBe(false);
    expect(approvalController.onTransactionReverted).toHaveBeenCalledWith({
      txHash: mockTxHash,
      request: mockRequest,
    });
  });

  it('should timeout after max retries', async () => {
    const sendMock = jest.fn().mockResolvedValue({
      value: [null],
    });
    provider.getSignatureStatuses.mockReturnValue({ send: sendMock });

    const resultPromise = waitForTransactionConfirmation({
      provider,
      txHash: mockTxHash,
      approvalController,
      request: mockRequest,
      network: mockNetwork,
      maxRetries: 2,
    });

    await jest.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toBe(false);
    expect(provider.getSignatureStatuses).toHaveBeenCalledTimes(2);
    expect(approvalController.onTransactionReverted).toHaveBeenCalledWith({
      txHash: mockTxHash,
      request: mockRequest,
    });
  });

  it('should handle network errors', async () => {
    const sendMock = jest.fn().mockRejectedValue(new Error('Transaction failed'));
    provider.getSignatureStatuses.mockReturnValue({ send: sendMock });

    const resultPromise = waitForTransactionConfirmation({
      provider,
      txHash: mockTxHash,
      approvalController,
      request: mockRequest,
      network: mockNetwork,
      maxRetries: 1,
    });

    await jest.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toBe(false);
    expect(approvalController.onTransactionReverted).toHaveBeenCalledWith({
      txHash: mockTxHash,
      request: mockRequest,
    });
  });
});
