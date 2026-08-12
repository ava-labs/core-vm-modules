import {
  NetworkVMType,
  RpcMethod,
  type ApprovalController,
  type Network,
  type RpcRequest,
} from '@avalabs/vm-module-types';
import { hvmSign } from './sign-transaction';
import { rpcErrors } from '@metamask/rpc-errors';
import { getProvider } from '../../utils/get-provider';
import { getNodeChainId } from '../../utils/get-node-chain-id';

jest.mock('../../utils/get-provider');
jest.mock('../../utils/get-node-chain-id', () => ({
  ...jest.requireActual('../../utils/get-node-chain-id'),
  getNodeChainId: jest.fn(),
}));

describe('packages/hvm-module/src/handlers/sign-transaction/sign-transaction', () => {
  const mockApprovalControler: ApprovalController = {
    requestApproval: jest.fn(),
    requestPublicKey: jest.fn(),
    onTransactionPending: jest.fn(),
    onTransactionConfirmed: jest.fn(),
    onTransactionReverted: jest.fn(),
  };

  // Check that the request params are valid and that the signingData is correct.
  const mockNodeAbi = {
    actions: [{ id: 7, name: 'send' }],
    outputs: [{ id: 8, name: 'trusted-output' }],
    types: [
      {
        name: 'send',
        fields: [
          { name: 'value', type: 'uint64' },
          { name: 'memo', type: 'string' },
        ],
      },
    ],
  };
  const mockGetAbi = jest.fn();
  const mockNodeChainId = 1234n;

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
            chainId: '1234',
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
    mockGetAbi.mockResolvedValue(mockNodeAbi);
    jest.mocked(getNodeChainId).mockResolvedValue(mockNodeChainId);
    jest.mocked(getProvider).mockReturnValue({
      getAbi: mockGetAbi,
    } as unknown as ReturnType<typeof getProvider>);
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
    ).resolves.toMatchObject({
      error: expect.objectContaining({
        message: expect.stringContaining('Transaction params are invalid'),
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
    ).resolves.toMatchObject({
      error: expect.objectContaining({
        message: expect.stringContaining('Transaction params are invalid'),
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
          {
            items: [
              {
                label: 'Max Fee',
                type: 'currency',
                value: 100000000n,
                maxDecimals: 9,
                symbol: 'COIN',
              },
            ],
            title: 'Network Fee',
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
          abi: mockNodeAbi,
          txPayload: {
            base: {
              timestamp: '1234567',
              chainId: '1234',
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

  it('fails closed (does not request approval) when the chain ABI cannot be fetched from the node', async () => {
    mockGetAbi.mockRejectedValue(new Error('node unreachable'));

    await expect(
      hvmSign({
        request: mockRequest,
        network: mockNetwork,
        approvalController: mockApprovalControler,
      }),
    ).resolves.toMatchObject({
      error: expect.objectContaining({
        message: expect.stringContaining('Unable to fetch the chain ABI'),
      }),
    });

    // Must never reach signing when the trusted ABI is unavailable.
    expect(mockApprovalControler.requestApproval).not.toHaveBeenCalled();
  });

  it('ignores any ABI supplied in the request and uses the node ABI', async () => {
    jest.mocked(mockApprovalControler.requestApproval).mockResolvedValue({
      signedData: '0xsigneddata',
    });

    await hvmSign({
      request: mockRequest,
      network: mockNetwork,
      approvalController: mockApprovalControler,
    });

    const call = jest.mocked(mockApprovalControler.requestApproval).mock.calls[0]?.[0];
    // The signingData ABI must be the trusted node ABI, not the request one.
    expect(call?.signingData).toMatchObject({
      data: { abi: mockNodeAbi },
    });
  });

  it('fails closed when the node chain id cannot be fetched', async () => {
    jest.mocked(getNodeChainId).mockRejectedValue(new Error('node unreachable'));

    await expect(
      hvmSign({
        request: mockRequest,
        network: mockNetwork,
        approvalController: mockApprovalControler,
      }),
    ).resolves.toMatchObject({
      error: expect.objectContaining({
        message: expect.stringContaining('Unable to fetch the chain ABI'),
      }),
    });

    expect(mockApprovalControler.requestApproval).not.toHaveBeenCalled();
  });

  it('rejects a transaction that targets a different chain than the connected one', async () => {
    jest.mocked(getNodeChainId).mockResolvedValue(9999n);

    await expect(
      hvmSign({
        request: mockRequest,
        network: mockNetwork,
        approvalController: mockApprovalControler,
      }),
    ).resolves.toMatchObject({
      error: expect.objectContaining({
        message: expect.stringContaining('Transaction params are invalid'),
      }),
    });

    expect(mockApprovalControler.requestApproval).not.toHaveBeenCalled();
  });

  it('accepts the cb58 form of the chain id as well as the decimal one', async () => {
    jest.mocked(mockApprovalControler.requestApproval).mockResolvedValue({ signedData: '0xsigneddata' });
    // '3QGVg754' is the cb58 encoding of the bytes 0x04d2, i.e. 1234.
    jest.mocked(getNodeChainId).mockResolvedValue(1234n);

    const request = structuredClone(mockRequest) as RpcRequest;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (request.params as any)[0].tx.base.chainId = '3QGVg754';

    await expect(
      hvmSign({ request, network: mockNetwork, approvalController: mockApprovalControler }),
    ).resolves.toEqual({ result: '0xsigneddata' });
  });

  it.each([
    ['a value whose type does not match the ABI', { value: true, memo: 'yolo' }],
    ['a field that is missing from the action', { memo: 'yolo' }],
    ['a field the chain ABI does not declare', { value: '1234', memo: 'yolo', hidden: 'not signed' }],
    ['a value outside the declared range', { value: '-1', memo: 'yolo' }],
  ])('rejects an action with %s without requesting approval', async (_, data) => {
    const request = structuredClone(mockRequest) as RpcRequest;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (request.params as any)[0].tx.actions[0].data = data;

    await expect(
      hvmSign({ request, network: mockNetwork, approvalController: mockApprovalControler }),
    ).resolves.toMatchObject({
      error: expect.objectContaining({
        message: expect.stringContaining('Transaction params are invalid'),
      }),
    });

    expect(mockApprovalControler.requestApproval).not.toHaveBeenCalled();
  });

  it('rejects an action that does not exist on the connected chain', async () => {
    const request = structuredClone(mockRequest) as RpcRequest;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (request.params as any)[0].tx.actions[0].actionName = 'unknown-action';

    await expect(
      hvmSign({ request, network: mockNetwork, approvalController: mockApprovalControler }),
    ).resolves.toMatchObject({
      error: expect.objectContaining({
        message: expect.stringContaining('Transaction params are invalid'),
      }),
    });

    expect(mockApprovalControler.requestApproval).not.toHaveBeenCalled();
  });

  it.each([
    ['a negative max fee', { maxFee: '-1' }],
    ['a max fee that does not fit in 64 bits', { maxFee: '18446744073709551616' }],
    ['a non-numeric timestamp', { timestamp: 'now' }],
  ])('rejects %s', async (_, base) => {
    const request = structuredClone(mockRequest) as RpcRequest;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Object.assign((request.params as any)[0].tx.base, base);

    await expect(
      hvmSign({ request, network: mockNetwork, approvalController: mockApprovalControler }),
    ).resolves.toMatchObject({
      error: expect.objectContaining({
        message: expect.stringContaining('Transaction params are invalid'),
      }),
    });

    expect(mockApprovalControler.requestApproval).not.toHaveBeenCalled();
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
