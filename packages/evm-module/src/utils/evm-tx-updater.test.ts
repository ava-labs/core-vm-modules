import { RpcMethod, type DisplayData, type SigningData } from '@avalabs/vm-module-types';
import { getTxUpdater } from './evm-tx-updater';
import { encodeApprovalLimit } from './encode-erc20-approval';

describe('evm-tx-updater', () => {
  const tokenAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
  const spenderAddress = '0x05BcD07A055a950183D0B0cd88caa579fE58D2Ea';

  const signingData: SigningData = {
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
  };
  const displayData: DisplayData = {
    tokenApprovals: {
      approvals: [
        {
          spenderAddress,
          token: {
            address: tokenAddress,
          },
          value: '0xaa',
        },
      ],
      isEditable: true,
    },
  } as any; // eslint-disable-line

  it('returns the updateTx callback', () => {
    const { updateTx } = getTxUpdater('abcd-1234', signingData, displayData);

    expect(updateTx).toEqual(expect.any(Function));
  });

  it('updates the fee config', () => {
    const { updateTx } = getTxUpdater('abcd-1234', signingData, displayData);

    expect(updateTx({ maxFeeRate: 10n, maxTipRate: 4n })).toEqual({
      signingData: {
        type: RpcMethod.ETH_SEND_TRANSACTION,
        account: 'from',
        data: {
          to: 'to',
          value: 100n,
          data: '0x',
          maxFeePerGas: 10n,
          maxPriorityFeePerGas: 4n,
          gasLimit: 1000n,
        },
      },
      displayData,
    });
  });

  it('prevents from changing the invoked function', () => {
    const { updateTx } = getTxUpdater(
      'abcd-1234',
      {
        ...signingData,
        data: {
          ...signingData.data,
          data: '0x',
        },
      },
      {} as DisplayData,
    );

    expect(() => updateTx({ approvalLimit: '0xff' })).toThrow(/Cannot edit the token approval/);
  });

  it('ensures approvalLimit is provided as hex string', () => {
    const { updateTx } = getTxUpdater(
      'abcd-1234',
      {
        ...signingData,
        data: {
          ...signingData.data,
          data: '0x',
        },
      },
      {} as DisplayData,
    );

    expect(() => updateTx({ approvalLimit: '255' })).toThrow(/Expected approvalLimit to be a hexadecimal number/);
  });

  it('updates the spend limit', () => {
    const { updateTx } = getTxUpdater(
      'abcd-1234',
      {
        ...signingData,
        data: {
          ...signingData.data,
          value: '0x',
          data: encodeApprovalLimit(tokenAddress, spenderAddress, '0xaa'),
        },
      },
      displayData,
    );

    expect(updateTx({ approvalLimit: '0xff' })).toEqual({
      signingData: {
        type: RpcMethod.ETH_SEND_TRANSACTION,
        account: 'from',
        data: {
          to: 'to',
          value: '0x',
          data: encodeApprovalLimit(tokenAddress, spenderAddress, '0xff'),
          maxFeePerGas: 5n,
          maxPriorityFeePerGas: 2n,
          gasLimit: 1000n,
        },
      },
      displayData: {
        ...displayData,
        tokenApprovals: {
          ...displayData.tokenApprovals,
          approvals: [
            {
              ...displayData.tokenApprovals?.approvals[0],
              value: '0xff',
            },
          ],
        },
      },
    });
  });
});
