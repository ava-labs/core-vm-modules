import { ethSendTransactionBatch } from './eth-send-transaction-batch';
import { parseRequestParams } from './schema';
import { getNonce } from '../../utils/get-nonce';
import { rpcErrors } from '@metamask/rpc-errors';
import {
  AlertType,
  RpcMethod,
  TokenType,
  NetworkVMType,
  DetailItemType,
  type Network,
  type BatchApprovalController,
  type SigningRequest,
  type SigningData_EthSendTx,
} from '@avalabs/vm-module-types';
import { ZodError } from 'zod';
import { getProvider } from '../../utils/get-provider';
import { getTxBatchUpdater } from '../../utils/evm-tx-batch-updater';
import type { TransactionParams } from '../../types';
import { addressItem, linkItem, networkItem } from '@internal/utils/src/utils/detail-item';

// doesn't print the ugly console errors out
jest.spyOn(global.console, 'error').mockImplementation(() => {});

const mockGetProvider = getProvider as jest.MockedFunction<typeof getProvider>;

jest.mock('./schema');
jest.mock('../../utils/evm-tx-batch-updater', () => ({
  getTxBatchUpdater: jest.fn().mockReturnValue({
    updateTxs: jest.fn(),
    cleanup: jest.fn(),
  }),
}));
jest.mock('../../utils/estimate-gas-limit');
jest.mock('../../utils/get-nonce');
jest.mock('../../utils/get-provider');
const mockBlockaid = {
  evm: {
    transactionBulk: {
      scan: jest
        .fn()
        .mockResolvedValue([{ validation: { result_type: 'Benign' } }, { validation: { result_type: 'Benign' } }]),
    },
  },
};

const mockOnTransactionConfirmed = jest.fn();
const mockOnTransactionReverted = jest.fn();
const mockOnTransactionPending = jest.fn();
const mockApprovalController: jest.Mocked<BatchApprovalController> = {
  requestApproval: jest.fn(),
  requestBatchApproval: jest.fn(),
  requestPublicKey: jest.fn(),
  onTransactionPending: mockOnTransactionPending,
  onTransactionConfirmed: mockOnTransactionConfirmed,
  onTransactionReverted: mockOnTransactionReverted,
};

const mockParseRequestParams = parseRequestParams as jest.MockedFunction<typeof parseRequestParams>;
const mockGetNonce = getNonce as jest.MockedFunction<typeof getNonce>;
const mockSend = jest.fn();
const mockGetTransactionReceipt = jest.fn();

const mockProvider = {
  send: mockSend,
  getTransactionReceipt: mockGetTransactionReceipt,
};

// @ts-expect-error missing properties
mockGetProvider.mockResolvedValue(mockProvider);
const testNetwork: Network = {
  isTestnet: false,
  chainId: 1,
  chainName: 'chainName',
  rpcUrl: 'rpcUrl',
  logoUri: 'logoUri',
  utilityAddresses: { multicall: 'multiContractAddress' },
  networkToken: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 9,
    description: 'Ethereum Token',
    logoUri: 'some logo uri',
  },
  vmName: NetworkVMType.EVM,
};

const tx1 = {
  from: '0x0123456789012345678901234567890123456789',
  to: '0x9876543210987654321098765432109876543210',
  data: '0xdata',
  value: '0xvalue',
  nonce: '12',
  gas: '0x1000',
  chainId: '0x1',
} as const;
const tx2 = {
  from: '0x0123456789012345678901234567890123456789',
  to: '0x9876543210987654321098765432109876543210',
  data: '0xdata2',
  value: '0xvalue2',
  nonce: '13',
  gas: '0x2000',
  chainId: '0x1',
} as const;
const testParams: [TransactionParams, TransactionParams] = [tx1, tx2];
const testDapp = { url: 'https://example.com', name: 'dapp', icon: 'icon' };
const testRequestParams = () => ({
  request: {
    requestId: '1',
    sessionId: '2',
    method: RpcMethod.ETH_SEND_TRANSACTION,
    chainId: 'eip155:1',
    dappInfo: testDapp,
    params: testParams,
  },
  network: testNetwork,
  approvalController: mockApprovalController,
  blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
});

const displayData = {
  title: 'Do you approve these transactions?',
  details: [
    {
      title: 'Transaction Details',
      items: [
        addressItem('Account', tx1.from),
        networkItem('Network', {
          name: testNetwork.chainName,
          logoUri: testNetwork.logoUri,
        }),
        linkItem('Website', testDapp),
      ],
    },
  ],
  networkFeeSelector: true,
  alert: undefined,
  tokenApprovals: undefined,
  balanceChange: undefined,
  isSimulationSuccessful: true,
};

const signingRequests: [SigningRequest, SigningRequest] = [
  {
    signingData: {
      type: RpcMethod.ETH_SEND_TRANSACTION,
      account: tx1.from,
      data: {
        accessList: undefined,
        type: 2,
        nonce: 12,
        gasLimit: 4096,
        to: tx1.to,
        from: tx1.from,
        data: tx1.data,
        value: tx1.value,
        chainId: '0x1',
      },
    },
    displayData: {
      alert: undefined,
      balanceChange: undefined,
      tokenApprovals: undefined,
      details: [
        {
          items: [
            {
              label: 'Account',
              type: DetailItemType.ADDRESS,
              value: tx1.from,
            },
            {
              label: 'Network',
              type: DetailItemType.NETWORK,
              value: {
                name: testNetwork.chainName,
                logoUri: testNetwork.logoUri,
              },
            },
            {
              label: 'Website',
              type: DetailItemType.LINK,
              value: {
                icon: 'icon',
                name: 'dapp',
                url: 'https://example.com',
              },
            },
            {
              label: 'Contract',
              type: DetailItemType.ADDRESS,
              value: tx1.to,
            },
          ],
          title: 'Transaction Details',
        },
      ],
      isSimulationSuccessful: false,
      networkFeeSelector: true,
      title: 'Do you approve this transaction?',
    },
  },
  {
    signingData: {
      type: RpcMethod.ETH_SEND_TRANSACTION,
      account: tx1.from,
      data: {
        accessList: undefined,
        type: 2,
        nonce: 13,
        gasLimit: 8192,
        to: tx2.to,
        from: tx2.from,
        data: tx2.data,
        value: tx2.value,
        chainId: '0x1',
      },
    },
    displayData: {
      alert: undefined,
      balanceChange: undefined,
      tokenApprovals: undefined,
      details: [
        {
          items: [
            {
              label: 'Account',
              type: DetailItemType.ADDRESS,
              value: tx2.from,
            },
            {
              label: 'Network',
              type: DetailItemType.NETWORK,
              value: {
                name: testNetwork.chainName,
                logoUri: testNetwork.logoUri,
              },
            },
            {
              label: 'Website',
              type: DetailItemType.LINK,
              value: {
                icon: 'icon',
                name: 'dapp',
                url: 'https://example.com',
              },
            },
            {
              label: 'Contract',
              type: DetailItemType.ADDRESS,
              value: tx2.to,
            },
          ],
          title: 'Transaction Details',
        },
      ],
      isSimulationSuccessful: false,
      networkFeeSelector: true,
      title: 'Do you approve this transaction?',
    },
  },
];

const testSignedTxHash = '0xsignedtxhash';
const testSignedTxHash2 = '0xsignedtxhash2';
const testTxHash = '0xtxhash';
const testTxHash2 = '0xtxhash2';

describe('eth_sendTransactionBatch handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockParseRequestParams.mockReturnValue({
      success: true,
      data: testParams,
    });

    mockApprovalController.requestBatchApproval.mockResolvedValue({
      result: [{ signedData: testSignedTxHash }, { signedData: testSignedTxHash2 }],
    });
  });

  it('should return error if request params are invalid', async () => {
    const testError = new Error('Invalid params') as ZodError;
    mockParseRequestParams.mockReturnValue({
      success: false,
      error: testError,
    });

    const response = await ethSendTransactionBatch(testRequestParams());

    expect(response).toEqual({
      error: rpcErrors.invalidParams({ message: 'Transaction params are invalid', data: { cause: testError } }),
    });
  });

  it('should calculate gas limit if some transactions do not have it set', async () => {
    mockGetTransactionReceipt.mockResolvedValueOnce({ status: 1 });
    const updateTx = jest.fn();
    jest.mocked(getTxBatchUpdater).mockReturnValueOnce({
      updateTx,
      cleanup: jest.fn(),
    });
    mockParseRequestParams.mockReturnValue({
      success: true,
      data: testParams.map(({ gas, ...rest }) => rest) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    const mockBlockaid = {
      evm: {
        transactionBulk: {
          scan: jest.fn().mockResolvedValue([
            {
              validation: { result_type: 'Benign' },
              gas_estimation: {
                status: 'Success',
                estimate: '0x5208', // 21000
              },
            },
            {
              validation: { result_type: 'Benign' },
              gas_estimation: {
                status: 'Success',
                estimate: '0x5208', // 21000
              },
            },
          ]),
        },
      },
    };

    const requestParams = {
      ...testRequestParams(),
      blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    };

    await ethSendTransactionBatch(requestParams);

    expect(mockGetProvider).toHaveBeenCalledWith({
      chainId: 1,
      chainName: 'chainName',
      rpcUrl: 'rpcUrl',
      multiContractAddress: 'multiContractAddress',
      pollingInterval: 1000,
    });

    expect(mockApprovalController.requestBatchApproval).toHaveBeenCalledWith({
      request: requestParams.request,
      displayData: {
        ...displayData,
        isSimulationSuccessful: false,
      },
      signingRequests: signingRequests.map((req) => ({
        ...req,
        signingData: {
          ...req.signingData,
          data: { ...(req.signingData.data as unknown as SigningData_EthSendTx), gasLimit: 21000 },
        },
      })),
      updateTx,
    });
  });

  it('should calculate nonce if not provided', async () => {
    mockGetTransactionReceipt.mockResolvedValueOnce({ status: 1 });
    const updateTx = jest.fn();
    jest.mocked(getTxBatchUpdater).mockReturnValueOnce({
      updateTx,
      cleanup: jest.fn(),
    });
    mockParseRequestParams.mockReturnValue({
      success: true,
      data: testParams.map(({ nonce, ...rest }) => rest) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });
    mockGetNonce.mockResolvedValue(12);

    const requestParams = testRequestParams();
    await ethSendTransactionBatch(requestParams);

    expect(mockGetProvider).toHaveBeenCalledWith({
      chainId: 1,
      chainName: 'chainName',
      rpcUrl: 'rpcUrl',
      multiContractAddress: 'multiContractAddress',
      pollingInterval: 1000,
    });

    expect(mockGetNonce).toHaveBeenCalledWith({
      provider: mockProvider,
      from: tx1.from,
    });

    expect(mockApprovalController.requestBatchApproval).toHaveBeenCalledWith({
      request: requestParams.request,
      displayData: {
        ...displayData,
        isSimulationSuccessful: false,
      },
      signingRequests,
      updateTx,
    });
  });

  it('should add alert object with Warning type to displayData when validation result is Warning', async () => {
    testWithValidationResultType('Warning');
  });

  it('should add alert object with Warning type to displayData when validation result is Error', async () => {
    testWithValidationResultType('Error');
  });

  it('should add alert object with Danger type to displayData when validation result is Malicious', async () => {
    testWithValidationResultType('Malicious');
  });

  it('should aggregate balance changes and token approvals in the upper-level displayData', async () => {
    mockGetTransactionReceipt.mockResolvedValueOnce({ status: 1 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockBlockaid = {
      evm: {
        transactionBulk: {
          scan: jest.fn().mockResolvedValue([
            {
              validation: {
                status: 'Success',
                result_type: 'Benign',
              },
              simulation: {
                status: 'Success',
                account_summary: {
                  assets_diffs: [],
                  traces: [
                    {
                      type: 'ERC20ExposureTrace',
                      exposed: {
                        raw_value: '0x1',
                        value: 1,
                        usd_price: '1',
                      },
                      trace_type: 'ExposureTrace',
                      owner: '0xOwenerAddress',
                      spender: '0xSpenderAddress',
                      asset: {
                        type: TokenType.ERC20,
                        address: '0xSwapTokenAAddress',
                        name: 'SwapTokenA',
                        symbol: 'TKNA',
                        decimals: 18,
                        logo_url: 'logo_url',
                      },
                    },
                  ],
                  exposures: [
                    {
                      asset: {
                        type: TokenType.ERC20,
                        address: '0xSwapTokenAAddress',
                        name: 'SwapTokenA',
                        symbol: 'TKNA',
                        decimals: 18,
                        logo_url: 'logo_url',
                      },
                      spenders: {
                        '0xSpenderAddress': {
                          exposure: [{ value: '1', raw_value: '0x1', usd_price: '1' }],
                        },
                      },
                    },
                  ],
                },
              },
            },
            {
              validation: {
                status: 'Success',
                result_type: 'Benign',
              },
              simulation: {
                status: 'Success',
                account_summary: {
                  exposures: [],
                  traces: [],
                  assets_diffs: [
                    {
                      asset: {
                        type: TokenType.ERC20,
                        address: '0xSwapTokenAAddress',
                        name: 'SwapTokenA',
                        symbol: 'TKNA',
                        decimals: 18,
                        logo_url: 'logo_url',
                      },
                      in: [],
                      out: [{ raw_value: '0x1', value: '1', usd_price: '1' }],
                    },
                    {
                      asset: {
                        type: TokenType.ERC20,
                        address: '0xSwapTokenBAddress',
                        name: 'SwapTokenB',
                        symbol: 'TKNB',
                        decimals: 18,
                        logo_url: 'logo_url',
                      },
                      in: [{ raw_value: '0x2', value: '2', usd_price: '1' }],
                      out: [],
                    },
                  ],
                },
              },
            },
          ]),
        },
      },
    };

    mockParseRequestParams.mockReturnValue({
      success: true,
      data: [
        {
          from: tx1.from,
          to: tx1.to,
          data: tx1.data,
          value: tx1.value,
          nonce: tx1.nonce,
          gas: tx1.gas,
          chainId: '0x1',
        },
        {
          from: tx2.from,
          to: tx2.to,
          data: tx2.data,
          value: tx2.value,
          nonce: tx2.nonce,
          gas: tx2.gas,
          chainId: '0x1',
        },
      ],
    });

    const updateTx = jest.fn();
    jest.mocked(getTxBatchUpdater).mockReturnValueOnce({
      updateTx,
      cleanup: jest.fn(),
    });

    const requestParams = {
      ...testRequestParams(),
      blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    };

    await ethSendTransactionBatch(requestParams);

    expect(mockGetProvider).toHaveBeenCalledWith({
      chainId: 1,
      chainName: 'chainName',
      rpcUrl: 'rpcUrl',
      multiContractAddress: 'multiContractAddress',
      pollingInterval: 1000,
    });

    const expectedBalanceChange = {
      ins: [
        {
          token: {
            type: TokenType.ERC20,
            address: '0xSwapTokenBAddress',
            name: 'SwapTokenB',
            symbol: 'TKNB',
            decimals: 18,
            logoUri: 'logo_url',
          },
          items: [
            {
              displayValue: '2',
              usdPrice: '1',
            },
          ],
        },
      ],
      outs: [
        {
          token: {
            type: TokenType.ERC20,
            address: '0xSwapTokenAAddress',
            name: 'SwapTokenA',
            symbol: 'TKNA',
            decimals: 18,
            logoUri: 'logo_url',
          },
          items: [
            {
              displayValue: '1',
              usdPrice: '1',
            },
          ],
        },
      ],
    };

    expect(mockApprovalController.requestBatchApproval).toHaveBeenCalledWith({
      request: requestParams.request,
      displayData: {
        ...displayData,
        isSimulationSuccessful: true,
        tokenApprovals: undefined,
        balanceChange: expectedBalanceChange,
      },
      signingRequests: [
        {
          ...signingRequests[0],
          displayData: {
            ...signingRequests[0].displayData,
            isSimulationSuccessful: true,
            tokenApprovals: {
              isEditable: false,
              approvals: [
                {
                  token: {
                    type: TokenType.ERC20,
                    address: '0xSwapTokenAAddress',
                    name: 'SwapTokenA',
                    symbol: 'TKNA',
                    decimals: 18,
                    logoUri: 'logo_url',
                  },
                  spenderAddress: '0xSpenderAddress',
                  value: '0x1',
                  usdPrice: '1',
                  logoUri: 'logo_url',
                },
              ],
            },
          },
        },
        {
          ...signingRequests[1],
          displayData: {
            ...signingRequests[1].displayData,
            isSimulationSuccessful: true,
            balanceChange: expectedBalanceChange,
          },
        },
      ],
      updateTx,
    });
  });

  it('should return error if some transactions end up without gas limits', async () => {
    mockParseRequestParams.mockReturnValue({
      success: true,
      data: [
        { from: '0xfrom', to: '0xto', value: '0xvalue', nonce: '12' },
        { from: '0xfrom', to: '0xto', value: '0xvalue', nonce: '13' },
      ],
    });

    const mockBlockaid = {
      evm: {
        transactionBulk: {
          scan: jest.fn().mockResolvedValue([
            {
              validation: { result_type: 'Benign' },
              gas_estimation: {
                status: 'Error',
              },
            },
            {
              validation: { result_type: 'Benign' },
              gas_estimation: {
                status: 'Success',
                estimated: '0x5208',
              },
            },
          ]),
        },
      },
    };

    const requestParams = {
      ...testRequestParams(),
      blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    };
    const response = await ethSendTransactionBatch(requestParams);

    expect(response).toEqual({
      error: rpcErrors.internal('Gas limit is missing in some transactions'),
    });
  });

  it('should return error if nonce calculation fails', async () => {
    mockParseRequestParams.mockReturnValue({
      success: true,
      data: [
        { from: '0xfrom', to: '0xto', value: '0xvalue', gas: '0x5208' },
        { from: '0xfrom', to: '0xto', value: '0xvalue', gas: '0x5208' },
      ],
    });
    mockGetNonce.mockRejectedValue(new Error('Nonce calculation error'));

    const requestParams = testRequestParams();
    const response = await ethSendTransactionBatch(requestParams);

    expect(response).toEqual({
      error: rpcErrors.internal('Unable to calculate nonce'),
    });
  });

  describe('approval succeeds', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      mockSend.mockResolvedValueOnce(testTxHash).mockResolvedValueOnce(testTxHash2);
    });

    it('should broadcast the signed transactions and return transaction hashes', async () => {
      mockApprovalController.requestBatchApproval.mockResolvedValueOnce({
        result: [{ signedData: testSignedTxHash }, { signedData: testSignedTxHash2 }],
      });

      mockGetTransactionReceipt.mockResolvedValueOnce({ status: 1 }).mockResolvedValueOnce({ status: 1 });

      const requestParams = testRequestParams();
      const response = await ethSendTransactionBatch(requestParams);

      expect(mockGetProvider).toHaveBeenCalledWith({
        chainId: 1,
        chainName: 'chainName',
        rpcUrl: 'rpcUrl',
        multiContractAddress: 'multiContractAddress',
        pollingInterval: 1000,
      });

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(mockSend).toHaveBeenNthCalledWith(1, 'eth_sendRawTransaction', [testSignedTxHash]);
      expect(mockSend).toHaveBeenNthCalledWith(2, 'eth_sendRawTransaction', [testSignedTxHash2]);

      expect(response).toStrictEqual({ result: [testTxHash, testTxHash2] });
    });

    it('should NOT broadcast ANY transactions unless ALL OF THEM are signed', async () => {
      mockApprovalController.requestBatchApproval.mockResolvedValueOnce({
        result: [{ signedData: testSignedTxHash }],
      });

      const requestParams = testRequestParams();
      const response = await ethSendTransactionBatch(requestParams);

      expect(mockGetProvider).toHaveBeenCalledWith({
        chainId: 1,
        chainName: 'chainName',
        rpcUrl: 'rpcUrl',
        multiContractAddress: 'multiContractAddress',
        pollingInterval: 1000,
      });

      expect(response).toStrictEqual({
        error: rpcErrors.internal('Invalid number of signatures. Expected 2, got 1'),
      });

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should break execution when some transactions are reverted', async () => {
      mockApprovalController.requestBatchApproval.mockResolvedValueOnce({
        result: [{ signedData: testSignedTxHash }, { signedData: testSignedTxHash2 }],
      });

      mockGetTransactionReceipt.mockResolvedValue({ status: 0 });

      const requestParams = testRequestParams();
      const response = await ethSendTransactionBatch(requestParams);

      expect(mockGetProvider).toHaveBeenCalledWith({
        chainId: 1,
        chainName: 'chainName',
        rpcUrl: 'rpcUrl',
        multiContractAddress: 'multiContractAddress',
        pollingInterval: 1000,
      });

      expect(response).toStrictEqual({ error: rpcErrors.internal('Transaction 1 failed! Batch execution stopped') });

      expect(mockGetTransactionReceipt).toHaveBeenCalledTimes(1);
      expect(mockGetTransactionReceipt).toHaveBeenCalledWith(testTxHash);

      expect(mockOnTransactionReverted).toHaveBeenCalledWith({ request: requestParams.request, txHash: testTxHash });
    });
  });

  describe('approval fails', () => {
    it('should return error', async () => {
      mockApprovalController.requestBatchApproval.mockResolvedValue({
        error: rpcErrors.internal('something went wrong'),
      });

      const requestParams = testRequestParams();
      const response = await ethSendTransactionBatch(requestParams);

      expect(response).toStrictEqual({ error: rpcErrors.internal('something went wrong') });
    });
  });
});

const testWithValidationResultType = async (resultType: 'Warning' | 'Error' | 'Malicious') => {
  mockGetTransactionReceipt.mockResolvedValue({ status: 1 });

  const updateTx = jest.fn();
  jest.mocked(getTxBatchUpdater).mockReturnValueOnce({
    updateTx,
    cleanup: jest.fn(),
  });

  const mockBlockaid = {
    evm: {
      transactionBulk: {
        scan: jest.fn().mockResolvedValue([
          {
            validation: { result_type: resultType },
            simulation: { status: 'Success', account_summary: { exposures: [], assets_diffs: [] } },
          },
          {
            validation: { result_type: resultType },
            simulation: { status: 'Success', account_summary: { exposures: [], assets_diffs: [] } },
          },
        ]),
      },
    },
  };

  mockParseRequestParams.mockReturnValue({
    success: true,
    data: [
      { from: tx1.from, to: tx1.to, data: tx1.data, value: tx1.value, nonce: tx1.nonce, gas: tx1.gas, chainId: '0x1' },
      { from: tx2.from, to: tx2.to, data: tx2.data, value: tx2.value, nonce: tx2.nonce, gas: tx2.gas, chainId: '0x1' },
    ],
  });

  const requestParams = {
    ...testRequestParams(),
    blockaid: mockBlockaid as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  };

  await ethSendTransactionBatch(requestParams);

  expect(mockGetProvider).toHaveBeenCalledWith({
    chainId: 1,
    chainName: 'chainName',
    rpcUrl: 'rpcUrl',
    multiContractAddress: 'multiContractAddress',
    pollingInterval: 1000,
  });

  if (resultType === 'Malicious') {
    const alert = {
      type: AlertType.DANGER,
      details: {
        title: 'Scam Transaction',
        description: 'This transaction has been flagged as malicious, I understand the risk.',
        actionTitles: {
          reject: 'Reject Transaction',
          proceed: 'Proceed Anyway',
        },
      },
    };

    expect(mockApprovalController.requestBatchApproval).toHaveBeenCalledWith({
      request: requestParams.request,
      displayData: {
        ...displayData,
        alert,
      },
      signingRequests: signingRequests.map((req) => ({
        ...req,
        displayData: {
          ...req.displayData,
          isSimulationSuccessful: true,
          alert,
        },
      })),
      updateTx,
    });
  } else {
    const alert = {
      type: AlertType.WARNING,
      details: {
        title: 'Suspicious Transaction',
        description: 'Use caution, this transaction may be malicious.',
      },
    };

    expect(mockApprovalController.requestBatchApproval).toHaveBeenCalledWith({
      request: requestParams.request,
      displayData: {
        ...displayData,
        alert,
      },
      signingRequests: signingRequests.map((req) => ({
        ...req,
        displayData: {
          ...req.displayData,
          isSimulationSuccessful: true,
          alert,
        },
      })),
      updateTx,
    });
  }
};
