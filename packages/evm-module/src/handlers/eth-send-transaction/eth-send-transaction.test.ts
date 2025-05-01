import { ethSendTransaction } from './eth-send-transaction';
import { parseRequestParams } from './schema';
import { estimateGasLimit } from '../../utils/estimate-gas-limit';
import { getNonce } from '../../utils/get-nonce';
import { rpcErrors } from '@metamask/rpc-errors';
import {
  AlertType,
  RpcMethod,
  TokenType,
  type ApprovalController,
  type Network,
  NetworkVMType,
} from '@avalabs/vm-module-types';
import { ZodError } from 'zod';
import { getProvider } from '../../utils/get-provider';
import Blockaid from '@blockaid/client';
import { getTxUpdater } from '../../utils/evm-tx-updater';

// doesn't print the ugly console errors out
jest.spyOn(global.console, 'error').mockImplementation(() => {});

const mockGetProvider = getProvider as jest.MockedFunction<typeof getProvider>;

const PROXY_API_URL = 'https://proxy-api.avax.network';

jest.mock('./schema');
jest.mock('../../utils/evm-tx-updater', () => ({
  getTxUpdater: jest.fn().mockReturnValue({
    updateTx: jest.fn(),
    cleanup: jest.fn(),
  }),
}));
jest.mock('../../utils/estimate-gas-limit');
jest.mock('../../utils/get-nonce');
jest.mock('../../utils/get-provider');
jest.mock('@blockaid/client', () => {
  return jest.fn().mockImplementation(() => {
    return {
      evm: {
        transaction: {
          scan: jest.fn().mockResolvedValue({ validation: { result_type: 'Benign' } }),
        },
        jsonRpc: {
          scan: jest.fn(),
        },
      },
    };
  });
});

const mockOnTransactionConfirmed = jest.fn();
const mockOnTransactionReverted = jest.fn();
const mockOnTransactionPending = jest.fn();
const mockApprovalController: jest.Mocked<ApprovalController> = {
  requestApproval: jest.fn(),
  requestPublicKey: jest.fn(),
  onTransactionPending: mockOnTransactionPending,
  onTransactionConfirmed: mockOnTransactionConfirmed,
  onTransactionReverted: mockOnTransactionReverted,
};

const mockParseRequestParams = parseRequestParams as jest.MockedFunction<typeof parseRequestParams>;
const mockEstimateGasLimit = estimateGasLimit as jest.MockedFunction<typeof estimateGasLimit>;
const mockGetNonce = getNonce as jest.MockedFunction<typeof getNonce>;
const mockSend = jest.fn();
const mockWaitForTransaction = jest.fn();

const mockProvider = {
  send: mockSend,
  waitForTransaction: mockWaitForTransaction,
};

// @ts-expect-error missing properties
mockGetProvider.mockResolvedValue(mockProvider);
const testNetwork: Network = {
  isTestnet: false,
  chainId: 1,
  chainName: 'chainName',
  rpcUrl: 'rpcUrl',
  logoUri: 'logoUri',
  explorerUrl: 'https://explorer.com',
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

const testParams = {
  from: '0xfrom',
  to: '0xto',
  data: '0xdata',
  value: '0xvalue',
  nonce: '12',
  gas: '0x5208',
  chainId: '0x1',
  accessList: [{ address: '0x123', storageKeys: ['0xkey1', '0xkey2'] }],
};
const testDapp = { url: 'https://example.com', name: 'dapp', icon: 'icon' };
const testRequestParams = () => ({
  request: {
    requestId: '1',
    sessionId: '2',
    method: RpcMethod.ETH_SEND_TRANSACTION,
    chainId: 'eip155:1',
    dappInfo: testDapp,
    params: [testParams],
  },
  network: testNetwork,
  approvalController: mockApprovalController,
  proxyApiUrl: PROXY_API_URL,
});

const displayData = {
  title: 'Do you approve this transaction?',
  network: {
    chainId: testNetwork.chainId,
    name: testNetwork.chainName,
    logoUri: testNetwork.logoUri,
  },
  details: [
    {
      title: 'Transaction Details',
      items: [
        {
          label: 'Website',
          value: testDapp,
          type: 'link',
        },
        {
          label: 'Account',
          value: '0xfrom',
          type: 'address',
        },
        {
          label: 'Contract',
          value: '0xto',
          type: 'address',
        },
        {
          label: 'Network',
          type: 'network',
          value: {
            name: testNetwork.chainName,
            logoUri: testNetwork.logoUri,
          },
        },
      ],
    },
  ],
  networkFeeSelector: true,
  alert: undefined,
  tokenApprovals: undefined,
  balanceChange: undefined,
  isSimulationSuccessful: true,
};

const signingData = {
  type: 'eth_sendTransaction',
  account: '0xfrom',
  data: {
    type: 2,
    nonce: 12,
    gasLimit: 21000,
    to: '0xto',
    from: '0xfrom',
    data: '0xdata',
    value: '0xvalue',
    chainId: 1,
    accessList: [{ address: '0x123', storageKeys: ['0xkey1', '0xkey2'] }],
  },
};

const testSignedTxHash = '0xsignedtxhash';
const testTxHash = '0xtxhash';

describe('eth_sendTransaction handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockParseRequestParams.mockReturnValue({
      success: true,
      data: [testParams],
    });

    mockApprovalController.requestApproval.mockResolvedValue({ signedData: testSignedTxHash });
  });

  it('should return error if request params are invalid', async () => {
    const testError = new Error('Invalid params') as ZodError;
    mockParseRequestParams.mockReturnValue({
      success: false,
      error: testError,
    });

    const response = await ethSendTransaction(testRequestParams());

    expect(response).toEqual({
      error: rpcErrors.invalidParams({ message: 'Transaction params are invalid', data: { cause: testError } }),
    });
  });

  it('should calculate gas limit if not provided', async () => {
    const updateTx = jest.fn();
    jest.mocked(getTxUpdater).mockReturnValueOnce({
      updateTx,
      cleanup: jest.fn(),
    });
    mockParseRequestParams.mockReturnValue({
      success: true,
      data: [
        {
          from: '0xfrom',
          to: '0xto',
          data: '0xdata',
          value: '0xvalue',
          nonce: '12',
          accessList: [{ address: '0x123', storageKeys: ['0xkey1', '0xkey2'] }],
        },
      ],
    });
    mockEstimateGasLimit.mockResolvedValue(21000);

    const requestParams = testRequestParams();

    await ethSendTransaction(requestParams);

    expect(mockGetProvider).toHaveBeenCalledWith({
      chainId: 1,
      chainName: 'chainName',
      rpcUrl: 'rpcUrl',
      multiContractAddress: 'multiContractAddress',
      pollingInterval: 1000,
    });

    expect(mockEstimateGasLimit).toHaveBeenCalledWith({
      provider: mockProvider,
      transactionParams: {
        from: '0xfrom',
        to: '0xto',
        data: '0xdata',
        value: '0xvalue',
        accessList: [{ address: '0x123', storageKeys: ['0xkey1', '0xkey2'] }],
      },
    });

    expect(mockApprovalController.requestApproval).toHaveBeenCalledWith({
      request: requestParams.request,
      displayData: {
        ...displayData,
        isSimulationSuccessful: false,
      },
      signingData,
      updateTx,
    });
  });

  it('should calculate nonce if not provided', async () => {
    const updateTx = jest.fn();
    jest.mocked(getTxUpdater).mockReturnValueOnce({
      updateTx,
      cleanup: jest.fn(),
    });
    mockParseRequestParams.mockReturnValue({
      success: true,
      data: [
        {
          from: '0xfrom',
          to: '0xto',
          data: '0xdata',
          value: '0xvalue',
          gas: '0x5208',
          accessList: [{ address: '0x123', storageKeys: ['0xkey1', '0xkey2'] }],
        },
      ],
    });
    mockGetNonce.mockResolvedValue(12);

    const requestParams = testRequestParams();
    await ethSendTransaction(requestParams);

    expect(mockGetProvider).toHaveBeenCalledWith({
      chainId: 1,
      chainName: 'chainName',
      rpcUrl: 'rpcUrl',
      multiContractAddress: 'multiContractAddress',
      pollingInterval: 1000,
    });

    expect(mockGetNonce).toHaveBeenCalledWith({
      provider: mockProvider,
      from: '0xfrom',
    });

    expect(mockApprovalController.requestApproval).toHaveBeenCalledWith({
      request: requestParams.request,
      displayData: {
        ...displayData,
        isSimulationSuccessful: false,
      },
      signingData,
      updateTx,
    });
  });

  it('should calculate both gas and nonce if not provided', async () => {
    const updateTx = jest.fn();
    jest.mocked(getTxUpdater).mockReturnValueOnce({
      updateTx,
      cleanup: jest.fn(),
    });
    mockParseRequestParams.mockReturnValue({
      success: true,
      data: [
        {
          from: '0xfrom',
          to: '0xto',
          data: '0xdata',
          value: '0xvalue',
          accessList: [{ address: '0x123', storageKeys: ['0xkey1', '0xkey2'] }],
        },
      ],
    });
    mockGetNonce.mockResolvedValue(12);
    mockEstimateGasLimit.mockResolvedValue(21000);

    const requestParams = testRequestParams();
    await ethSendTransaction(requestParams);

    expect(mockGetProvider).toHaveBeenCalledWith({
      chainId: 1,
      chainName: 'chainName',
      rpcUrl: 'rpcUrl',
      multiContractAddress: 'multiContractAddress',
      pollingInterval: 1000,
    });

    expect(mockGetNonce).toHaveBeenCalledWith({
      provider: mockProvider,
      from: '0xfrom',
    });

    expect(mockEstimateGasLimit).toHaveBeenCalledWith({
      provider: mockProvider,
      transactionParams: {
        from: '0xfrom',
        to: '0xto',
        data: '0xdata',
        value: '0xvalue',
        accessList: [{ address: '0x123', storageKeys: ['0xkey1', '0xkey2'] }],
      },
    });

    expect(mockApprovalController.requestApproval).toHaveBeenCalledWith({
      request: requestParams.request,
      displayData: {
        ...displayData,
        isSimulationSuccessful: false,
      },
      signingData,
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

  it('should process transaction and add token approvals and balance changes to displayData', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Blockaid as any).mockImplementation(() => ({
      evm: {
        transaction: {
          scan: jest.fn().mockResolvedValue({
            validation: { result_type: 'Benign' },
            simulation: {
              status: 'Success',
              account_summary: {
                traces: [
                  {
                    trace_type: 'ExposureTrace',
                    type: 'ERC20ExposureTrace',
                    asset: {
                      type: TokenType.ERC20,
                      address: '0xTokenAddress',
                      name: 'TokenName',
                      symbol: 'TKN',
                      decimals: 18,
                      logo_url: 'logo_url',
                    },
                    spender: '0xSpenderAddress',
                    exposed: {
                      raw_value: '1',
                      usd_price: 1,
                    },
                  },
                ],
                assets_diffs: [
                  {
                    asset: {
                      name: 'TokenName',
                      symbol: 'TKN',
                      decimals: 18,
                      logo_url: 'logo_url',
                      type: TokenType.ERC20,
                      address: '0xTokenAddress',
                    },
                    in: [{ value: '1', usd_price: '1' }],
                    out: [{ value: '1', usd_price: '1' }],
                  },
                ],
              },
            },
          }),
        },
      },
    }));

    mockParseRequestParams.mockReturnValue({
      success: true,
      data: [
        {
          from: '0xfrom',
          to: '0xto',
          data: '0xdata',
          value: '0xvalue',
          nonce: '12',
          gas: '0x5208',
          accessList: [{ address: '0x123', storageKeys: ['0xkey1', '0xkey2'] }],
        },
      ],
    });

    const updateTx = jest.fn();
    jest.mocked(getTxUpdater).mockReturnValueOnce({
      updateTx,
      cleanup: jest.fn(),
    });

    const requestParams = testRequestParams();

    await ethSendTransaction(requestParams);

    expect(mockGetProvider).toHaveBeenCalledWith({
      chainId: 1,
      chainName: 'chainName',
      rpcUrl: 'rpcUrl',
      multiContractAddress: 'multiContractAddress',
      pollingInterval: 1000,
    });

    expect(mockApprovalController.requestApproval).toHaveBeenCalledWith({
      request: requestParams.request,
      displayData: {
        ...displayData,
        tokenApprovals: {
          isEditable: true,
          approvals: [
            {
              token: {
                type: TokenType.ERC20,
                address: '0xTokenAddress',
                name: 'TokenName',
                symbol: 'TKN',
                decimals: 18,
                logoUri: 'logo_url',
              },
              spenderAddress: '0xSpenderAddress',
              value: '1',
              usdPrice: '1',
              logoUri: 'logo_url',
            },
          ],
        },
        balanceChange: {
          ins: [
            {
              token: {
                type: TokenType.ERC20,
                address: '0xTokenAddress',
                name: 'TokenName',
                symbol: 'TKN',
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
          outs: [
            {
              token: {
                type: TokenType.ERC20,
                address: '0xTokenAddress',
                name: 'TokenName',
                symbol: 'TKN',
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
        },
      },
      signingData,
      updateTx,
    });
  });

  it('should return error if gas limit calculation fails', async () => {
    mockParseRequestParams.mockReturnValue({
      success: true,
      data: [{ from: '0xfrom', to: '0xto', data: '0xdata', value: '0xvalue', nonce: '12' }],
    });

    mockEstimateGasLimit.mockRejectedValue(new Error('gas calculation error'));

    const requestParams = testRequestParams();
    const response = await ethSendTransaction(requestParams);

    expect(response).toEqual({
      error: rpcErrors.internal('Unable to calculate gas limit'),
    });
  });

  it('should return error if nonce calculation fails', async () => {
    mockParseRequestParams.mockReturnValue({
      success: true,
      data: [{ from: '0xfrom', to: '0xto', data: '0xdata', value: '0xvalue', gas: '0x5208' }],
    });
    mockGetNonce.mockRejectedValue(new Error('Nonce calculation error'));

    const requestParams = testRequestParams();
    const response = await ethSendTransaction(requestParams);

    expect(response).toEqual({
      error: rpcErrors.internal('Unable to calculate nonce'),
    });
  });

  describe('approval succeeds', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      mockApprovalController.requestApproval.mockResolvedValue({ signedData: testSignedTxHash });
      mockSend.mockResolvedValue(testTxHash);
    });

    it('should broadcast the signed transaction and return transaction hash', async () => {
      const requestParams = testRequestParams();
      const response = await ethSendTransaction(requestParams);

      expect(mockGetProvider).toHaveBeenCalledWith({
        chainId: 1,
        chainName: 'chainName',
        rpcUrl: 'rpcUrl',
        multiContractAddress: 'multiContractAddress',
        pollingInterval: 1000,
      });

      expect(mockSend).toHaveBeenCalledWith('eth_sendRawTransaction', [testSignedTxHash]);

      expect(response).toStrictEqual({ result: testTxHash });
    });

    it('should notify when transaction is confirmed', async () => {
      mockWaitForTransaction.mockResolvedValue({ status: 1 });

      const requestParams = testRequestParams();
      const response = await ethSendTransaction(requestParams);

      expect(mockGetProvider).toHaveBeenCalledWith({
        chainId: 1,
        chainName: 'chainName',
        rpcUrl: 'rpcUrl',
        multiContractAddress: 'multiContractAddress',
        pollingInterval: 1000,
      });

      expect(response).toStrictEqual({ result: testTxHash });

      expect(mockWaitForTransaction).toHaveBeenCalledWith(testTxHash);

      expect(mockOnTransactionConfirmed).toHaveBeenCalledWith({
        txHash: testTxHash,
        explorerLink: 'https://explorer.com/tx/' + testTxHash,
        requestId: '1',
      });
    });

    it('should notify when transaction is reverted', async () => {
      mockWaitForTransaction.mockResolvedValue({ status: 0 });

      const requestParams = testRequestParams();
      const response = await ethSendTransaction(requestParams);

      expect(mockGetProvider).toHaveBeenCalledWith({
        chainId: 1,
        chainName: 'chainName',
        rpcUrl: 'rpcUrl',
        multiContractAddress: 'multiContractAddress',
        pollingInterval: 1000,
      });

      expect(response).toStrictEqual({ result: testTxHash });

      expect(mockWaitForTransaction).toHaveBeenCalledWith(testTxHash);

      expect(mockOnTransactionReverted).toHaveBeenCalledWith({ requestId: '1', txHash: testTxHash });
    });
  });

  describe('approval fails', () => {
    it('should return error', async () => {
      mockApprovalController.requestApproval.mockResolvedValue({ error: rpcErrors.internal('something went wrong') });

      const requestParams = testRequestParams();
      const response = await ethSendTransaction(requestParams);

      expect(response).toStrictEqual({ error: rpcErrors.internal('something went wrong') });
    });
  });
});

const testWithValidationResultType = async (resultType: 'Warning' | 'Error' | 'Malicious') => {
  const updateTx = jest.fn();
  jest.mocked(getTxUpdater).mockReturnValueOnce({
    updateTx,
    cleanup: jest.fn(),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Blockaid as any).mockImplementation(() => ({
    evm: {
      transaction: {
        scan: jest.fn().mockResolvedValue({
          validation: { result_type: resultType },
          simulation: { status: 'Success', account_summary: { exposures: [], assets_diffs: [] } },
        }),
      },
    },
  }));

  mockParseRequestParams.mockReturnValue({
    success: true,
    data: [
      {
        from: '0xfrom',
        to: '0xto',
        data: '0xdata',
        value: '0xvalue',
        nonce: '12',
        gas: '0x5208',
        accessList: [{ address: '0x123', storageKeys: ['0xkey1', '0xkey2'] }],
      },
    ],
  });

  const requestParams = testRequestParams();

  await ethSendTransaction(requestParams);

  expect(mockGetProvider).toHaveBeenCalledWith({
    chainId: 1,
    chainName: 'chainName',
    rpcUrl: 'rpcUrl',
    multiContractAddress: 'multiContractAddress',
    pollingInterval: 1000,
  });

  if (resultType === 'Malicious') {
    expect(mockApprovalController.requestApproval).toHaveBeenCalledWith({
      request: requestParams.request,
      displayData: {
        ...displayData,
        alert: {
          type: AlertType.DANGER,
          details: {
            title: 'Scam Transaction',
            description: 'This transaction has been flagged as malicious, I understand the risk.',
            actionTitles: {
              reject: 'Reject Transaction',
              proceed: 'Proceed Anyway',
            },
          },
        },
      },
      signingData,
      updateTx,
    });
  } else {
    expect(mockApprovalController.requestApproval).toHaveBeenCalledWith({
      request: requestParams.request,
      displayData: {
        ...displayData,
        alert: {
          type: AlertType.WARNING,
          details: {
            title: 'Suspicious Transaction',
            description: 'Use caution, this transaction may be malicious.',
          },
        },
      },
      signingData,
      updateTx,
    });
  }
};
