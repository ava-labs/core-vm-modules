import { RpcMethod } from '@avalabs/vm-module-types';
import { getTxUpdater } from './evm-tx-updater';

describe('evm-tx-updater', () => {
  it('returns the updateTx callback', () => {
    const { updateTx } = getTxUpdater('abcd-1234', {
      type: RpcMethod.ETH_SEND_TRANSACTION,
      account: 'from',
      data: {
        to: 'to',
        data: '0x',
        value: 100n,
        maxFeePerGas: 5n,
        maxPriorityFeePerGas: 2n,
        gasLimit: 1000n,
      },
    });

    expect(updateTx({ maxFeeRate: 10n, maxTipRate: 4n, data: '0x1234' })).toEqual({
      type: RpcMethod.ETH_SEND_TRANSACTION,
      account: 'from',
      data: {
        to: 'to',
        data: '0x1234',
        value: 100n,
        maxFeePerGas: 10n,
        maxPriorityFeePerGas: 4n,
        gasLimit: 1000n,
      },
    });
  });
});
