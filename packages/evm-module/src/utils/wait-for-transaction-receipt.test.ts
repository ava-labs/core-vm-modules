import type { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';

import { waitForTransactionReceipt } from './wait-for-transaction-receipt';
import type { RpcRequest } from '@avalabs/vm-module-types';
import { retry } from '@internal/utils';

jest.mock('@internal/utils', () => {
  const actual = jest.requireActual('@internal/utils');
  return {
    ...actual,
    retry: jest.fn(),
  };
});

const mockRetry = retry as jest.MockedFunction<typeof retry>;

const explorerUrl = 'https://explorer.com';
describe('waitForTransactionReceipt', () => {
  let provider: JsonRpcBatchInternal;
  let txHash: `0x${string}`;
  let onTransactionPending: jest.Mock;
  let onTransactionConfirmed: jest.Mock;
  let onTransactionReverted: jest.Mock;
  let request: RpcRequest;

  beforeEach(() => {
    provider = {
      getTransactionReceipt: jest.fn(),
    } as unknown as JsonRpcBatchInternal;
    txHash = '0x123';
    onTransactionPending = jest.fn();
    onTransactionConfirmed = jest.fn();
    onTransactionReverted = jest.fn();
    request = {
      requestId: 'request-1',
      sessionId: 'session-1',
      method: 'eth_sendTransaction',
      chainId: '0x1',
    } as RpcRequest;
  });

  it('should call onTransactionPending when waiting for transaction receipt', async () => {
    jest.mocked(provider.getTransactionReceipt).mockResolvedValue({ status: 1 } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    waitForTransactionReceipt({
      explorerUrl,
      provider,
      txHash,
      onTransactionPending,
      onTransactionConfirmed,
      onTransactionReverted,
      request,
    });

    expect(onTransactionPending).toHaveBeenCalledWith({
      txHash,
      request,
    });
  });

  it('should call onTransactionConfirmed when transaction is successful', async () => {
    mockRetry.mockResolvedValue({ status: 1 });

    const result = await waitForTransactionReceipt({
      explorerUrl,
      provider,
      txHash,
      onTransactionPending,
      onTransactionConfirmed,
      onTransactionReverted,
      request,
    });

    expect(result).toBe(true);
    expect(onTransactionConfirmed).toHaveBeenCalledWith({
      txHash,
      explorerLink: 'https://explorer.com/tx/' + txHash,
      request,
    });
    expect(onTransactionReverted).not.toHaveBeenCalled();
  });

  it('should call onTransactionReverted when transaction is reverted', async () => {
    mockRetry.mockResolvedValue({ status: 0 });

    const result = await waitForTransactionReceipt({
      explorerUrl,
      provider,
      txHash,
      onTransactionPending,
      onTransactionConfirmed,
      onTransactionReverted,
      request,
    });

    expect(result).toBe(false);
    expect(onTransactionReverted).toHaveBeenCalledWith({ txHash, request });
    expect(onTransactionConfirmed).not.toHaveBeenCalled();
  });

  it('should call onTransactionReverted when an error occurs', async () => {
    mockRetry.mockRejectedValue(new Error('Transaction error'));

    const result = await waitForTransactionReceipt({
      explorerUrl,
      provider,
      txHash,
      onTransactionPending,
      onTransactionConfirmed,
      onTransactionReverted,
      request,
    });

    expect(result).toBe(false);
    expect(onTransactionReverted).toHaveBeenCalledWith({ txHash, request });
    expect(onTransactionConfirmed).not.toHaveBeenCalled();
  });
});
