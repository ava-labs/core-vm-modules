import { RpcMethod } from '@avalabs/vm-module-types';
import { getFeeUpdater } from './evm-fee-updater';

describe('evm-fee-updater', () => {
  it('returns the updateFee callback', () => {
    const { updateFee } = getFeeUpdater('abcd-1234', {
      type: RpcMethod.ETH_SEND_TRANSACTION,
      account: 'from',
      data: {
        to: 'to',
        value: 100n,
        maxFeePerGas: 5n,
        maxPriorityFeePerGas: 2n,
        gasLimit: 1000n,
      },
    });

    expect(updateFee(10n, 4n)).toEqual({
      type: RpcMethod.ETH_SEND_TRANSACTION,
      account: 'from',
      data: {
        to: 'to',
        value: 100n,
        maxFeePerGas: 10n,
        maxPriorityFeePerGas: 4n,
        gasLimit: 1000n,
      },
    });
  });
});
