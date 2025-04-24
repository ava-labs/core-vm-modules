import {
  NetworkVMType,
  RpcMethod,
  type ApprovalController,
  type Network,
  type RpcRequest,
} from '@avalabs/vm-module-types';
import { hvmSign } from './sign-transaction';
import { rpcErrors } from '@metamask/rpc-errors';

describe('packages/hvm-module/src/handlers/sign-transaction/sign-transaction', () => {
  const mockApprovalControler: ApprovalController = {
    requestApproval: jest.fn(),
    requestPublicKey: jest.fn(),
    onTransactionConfirmed: jest.fn(),
    onTransactionReverted: jest.fn(),
  };

  const mockNetwork: Network = {
    chainId: 1,
    chainName: 'example',
    rpcUrl: 'https://rpc.example',
    vmName: NetworkVMType.HVM,
    vmRpcPrefix: 'hvm',
    networkToken: {
      name: 'COIN',
      symbol: 'COIN',
      decimals: 9,
    },
  };

  const mockRequest: RpcRequest = {
    requestId: 'requestId',
    sessionId: 'sessionId',
    method: RpcMethod.HVM_SIGN_TRANSACTION,
    chainId: 'hvm:1234',
    params: [
      {
        abi: {
          actions: [{ id: 1, name: 'send' }],
          outputs: [{ id: 2, name: 'output' }],
          types: [
            {
              name: 'first-type',
              fields: [
                {
                  name: 'id',
                  type: 'number',
                },
                {
                  name: 'name',
                  type: 'string',
                },
              ],
            },
          ],
        },
        tx: {
          base: {
            timestamp: '1234567',
            chainId: 'hvm1234',
            maxFee: '100000000',
          },
          actions: [
            {
              actionName: 'send',
              data: {
                value: '1234',
                memo: 'yolo',
              },
            },
          ],
        },
      },
    ],
    dappInfo: {
      icon: 'icon',
      name: 'name',
      url: 'url',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns error if transaction params are in the wrong format', async () => {
    await expect(
      hvmSign({
        request: {
          ...mockRequest,
          params: [{ tx: 'asd' }],
        },
        network: mockNetwork,
        approvalController: mockApprovalControler,
      }),
    ).resolves.toStrictEqual({
      error: rpcErrors.invalidParams({
        message: 'Transaction params are invalid',
        data: { cause: { _errors: ['Expected array, received object'] } },
      }),
    });
  });

  it('returns error if no transaction found in the params', async () => {
    await expect(
      hvmSign({
        request: {
          ...mockRequest,
          params: [],
        },
        network: mockNetwork,
        approvalController: mockApprovalControler,
      }),
    ).resolves.toStrictEqual({
      error: rpcErrors.invalidParams({
        message: 'Transaction params are invalid',
        data: { cause: 'No transaction found' },
      }),
    });
  });

  it('returns signed data and requests approval with correct display data', async () => {
    jest.mocked(mockApprovalControler.requestApproval).mockResolvedValue({
      signedData: '0xsigneddata',
    });

    await expect(
      hvmSign({
        request: mockRequest,
        network: mockNetwork,
        approvalController: mockApprovalControler,
      }),
    ).resolves.toEqual({ result: '0xsigneddata' });

    expect(mockApprovalControler.requestApproval).toHaveBeenCalledTimes(1);
    expect(mockApprovalControler.requestApproval).toHaveBeenCalledWith({
      request: mockRequest,
      displayData: {
        dAppInfo: {
          action: 'name is requesting to sign the following message',
          logoUri: 'icon',
          name: 'name',
        },
        details: [
          {
            items: [
              {
                alignment: 'vertical',
                label: 'value',
                type: 'text',
                value: '1234',
              },
              {
                alignment: 'vertical',
                label: 'memo',
                type: 'text',
                value: 'yolo',
              },
            ],
            title: 'send',
          },
        ],
        network: {
          chainId: 1,
          logoUri: undefined,
          name: 'example',
        },
        title: 'Do you approve this transaction?',
      },
      signingData: {
        type: RpcMethod.HVM_SIGN_TRANSACTION,
        data: {
          abi: {
            actions: [{ id: 1, name: 'send' }],
            outputs: [{ id: 2, name: 'output' }],
            types: [
              {
                name: 'first-type',
                fields: [
                  {
                    name: 'id',
                    type: 'number',
                  },
                  {
                    name: 'name',
                    type: 'string',
                  },
                ],
              },
            ],
          },
          txPayload: {
            base: {
              timestamp: '1234567',
              chainId: 'hvm1234',
              maxFee: '100000000',
            },
            actions: [
              {
                actionName: 'send',
                data: {
                  value: '1234',
                  memo: 'yolo',
                },
              },
            ],
          },
        },
      },
    });
  });

  it('handles approval rejection', async () => {
    jest.mocked(mockApprovalControler.requestApproval).mockResolvedValue({
      error: rpcErrors.transactionRejected(),
    });

    await expect(
      hvmSign({
        request: mockRequest,
        network: mockNetwork,
        approvalController: mockApprovalControler,
      }),
    ).resolves.toEqual({ error: rpcErrors.transactionRejected() });
  });

  it('returns error when signed data is missing', async () => {
    jest.mocked(mockApprovalControler.requestApproval).mockResolvedValue({ txHash: 'txhash' });

    await expect(
      hvmSign({
        request: mockRequest,
        network: mockNetwork,
        approvalController: mockApprovalControler,
      }),
    ).resolves.toEqual({ error: rpcErrors.internal('No signed data returned') });
  });
});
