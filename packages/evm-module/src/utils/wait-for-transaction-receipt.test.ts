import type { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';

import { waitForTransactionReceipt } from './wait-for-transaction-receipt';

const explorerUrl = 'https://explorer.com';
describe('waitForTransactionReceipt', () => {
  let provider: JsonRpcBatchInternal;
  let txHash: `0x${string}`;
  let onTransactionConfirmed: jest.Mock;
  let onTransactionReverted: jest.Mock;
  let requestId: string;

  beforeEach(() => {
    provider = {
      waitForTransaction: jest.fn(),
    } as unknown as JsonRpcBatchInternal;
    txHash = '0x123';
    onTransactionConfirmed = jest.fn();
    onTransactionReverted = jest.fn();
    requestId = 'request-1';
  });

  it('should call onTransactionConfirmed when transaction is successful', async () => {
    jest.mocked(provider.waitForTransaction).mockResolvedValue({ status: 1 } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    const result = await waitForTransactionReceipt({
      explorerUrl,
      provider,
      txHash,
      onTransactionConfirmed,
      onTransactionReverted,
      requestId,
    });

    expect(result).toBe(true);
    expect(onTransactionConfirmed).toHaveBeenCalledWith({
      explorerLink: 'https://explorer.com/tx/' + txHash,
      requestId,
    });
    expect(onTransactionReverted).not.toHaveBeenCalled();
  });

  it('should call onTransactionReverted when transaction is reverted', async () => {
    jest.mocked(provider.waitForTransaction).mockResolvedValue({ status: 0 } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    const result = await waitForTransactionReceipt({
      explorerUrl,
      provider,
      txHash,
      onTransactionConfirmed,
      onTransactionReverted,
      requestId,
    });

    expect(result).toBe(false);
    expect(onTransactionReverted).toHaveBeenCalledWith(txHash, requestId);
    expect(onTransactionConfirmed).not.toHaveBeenCalled();
  });

  it('should call onTransactionReverted when an error occurs', async () => {
    jest.mocked(provider.waitForTransaction).mockRejectedValue(new Error('Transaction error')); // eslint-disable-line @typescript-eslint/no-explicit-any

    const result = await waitForTransactionReceipt({
      explorerUrl,
      provider,
      txHash,
      onTransactionConfirmed,
      onTransactionReverted,
      requestId,
    });

    expect(result).toBe(false);
    expect(onTransactionReverted).toHaveBeenCalledWith(txHash, requestId);
    expect(onTransactionConfirmed).not.toHaveBeenCalled();
  });
});
