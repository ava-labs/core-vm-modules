import { RpcMethod, type TokenWithBalanceBTC } from '@avalabs/vm-module-types';
import { getTxUpdater } from './bitcoin-tx-updater';
import { createTransferTx, type BitcoinOutputUTXO, type BitcoinProvider } from '@avalabs/core-wallets-sdk';

jest.mock('@avalabs/core-wallets-sdk');

describe('bitcoin-tx-updater', () => {
  const testInputs = [
    {
      txHash: 'f1a6c8e9213d5b8a7d3ab9084b6d2e9487f2e7681c5ab84f56c3e0c4f20d1a5b',
      txHex: '02000000000101e40f5678c44e9e0012a20b2ff7f88802b1a27b3b492198a1f6bb482f5bc22a60',
      index: 3,
      value: 5000,
      script: '76a9141a6b2b63c9e88eb8fd24d6c982a5a7afecba5ec488ac',
      blockHeight: 796543,
      confirmations: 253,
      confirmedTime: '2023-08-21T15:32:10Z',
    },
  ];

  const testOutputs: BitcoinOutputUTXO[] = [
    {
      address: '76a9141a6b2b63c9e88eb8fd24d6c982a5a7afecba5ec488ac',
      value: 0.0023,
    },
  ];

  const testBtcBalance = {
    utxos: [
      {
        txHash: 'e4c1b8f3a7d8c2e5a9b4d6f7e3a1c8b2e9f7d1a4c8d6f3b1e5a7b9c2d8a3f1b2',
        txHex: '0100000001b7c3e5d8a1f9c3b7e1a8d6c9e3f4b1a8e9d7c3f8a1b7e9c3a5d8f3e9b7d2a1',
        index: 0,
        value: 5000,
        script: '76a914b1d8f9e3a7b2d8f9e3a1b7c8f9e3d8a1c3f8e9a7ac',
        blockHeight: 812763,
        confirmations: 325,
        confirmedTime: '2024-06-01T10:12:34Z',
      },
    ],
  } as unknown as TokenWithBalanceBTC;

  const network = {};
  const provider = { getNetwork: jest.fn().mockReturnValue(network) } as unknown as BitcoinProvider;

  it('returns the updateTx callback', () => {
    const updatedTx = {
      inputs: [],
      outputs: [],
      fee: 100,
    };

    jest.mocked(createTransferTx).mockReturnValue(updatedTx);

    const { updateTx } = getTxUpdater(
      'abcd-1234',
      {
        type: RpcMethod.BITCOIN_SEND_TRANSACTION,
        account: 'from',
        data: {
          to: 'to',
          amount: 1,
          fee: 1,
          feeRate: 1,
          gasLimit: 1,
          inputs: testInputs,
          outputs: testOutputs,
          balance: testBtcBalance,
        },
      },
      provider,
    );

    expect(updateTx({ feeRate: 2 })).toEqual({
      type: RpcMethod.BITCOIN_SEND_TRANSACTION,
      account: 'from',
      data: {
        to: 'to',
        amount: 1,
        fee: updatedTx.fee,
        feeRate: 2,
        gasLimit: 50,
        inputs: updatedTx.inputs,
        outputs: updatedTx.outputs,
        balance: testBtcBalance,
      },
    });

    expect(createTransferTx).toHaveBeenCalledWith('to', 'from', 1, 2, testBtcBalance.utxos, network);
  });
});
