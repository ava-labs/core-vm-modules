import { ethSendTransaction } from './eth-send-transaction';
import { parseRequestParams } from './schema';
import { estimateGasLimit } from '../../utils/estimate-gas-limit';
import { getNonce } from '../../utils/get-nonce';
import { rpcErrors } from '@metamask/rpc-errors';
import { getClientForChain } from '../../utils/get-client-for-chain';
import { RpcMethod, TokenType, type Hex } from '@avalabs/vm-module-types';
import type { ApprovalController } from '../../types';
import { ZodError } from 'zod';

jest.mock('./schema');
jest.mock('../../utils/estimate-gas-limit');
jest.mock('../../utils/get-nonce');
jest.mock('../../utils/get-client-for-chain');

const mockOnTransactionConfirmed = jest.fn();
const mockOnTransactionReverted = jest.fn();
const mockApprovalController: jest.Mocked<ApprovalController> = {
  requestApproval: jest.fn(),
  onTransactionConfirmed: mockOnTransactionConfirmed,
  onTransactionReverted: mockOnTransactionReverted,
};

const mockParseRequestParams = parseRequestParams as jest.MockedFunction<typeof parseRequestParams>;
const mockEstimateGasLimit = estimateGasLimit as jest.MockedFunction<typeof estimateGasLimit>;
const mockGetNonce = getNonce as jest.MockedFunction<typeof getNonce>;
const mockGetClientForChain = getClientForChain as jest.MockedFunction<typeof getClientForChain>;

const mockSendRawTransaction = jest.fn();
const mockWaitForTransactionReceipt = jest.fn();

// @ts-expect-error missing properties
mockGetClientForChain.mockReturnValue({
  sendRawTransaction: mockSendRawTransaction,
  waitForTransactionReceipt: mockWaitForTransactionReceipt,
});

const testChain = {
  isTestnet: false,
  chainId: 'eip155:1',
  chainName: 'chainName',
  rpcUrl: 'rpcUrl',
  logoUrl: 'logoUrl',
  multiContractAddress: 'multiContractAddress' as Hex,
  networkToken: {
    type: TokenType.NATIVE,
    address: 'address' as Hex,
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 9,
  },
};

const testParams = { from: '0xfrom', to: '0xto', data: '0xdata', value: '0xvalue', nonce: '12', gas: '0x5208' };

const testRequestParams = () => ({
  request: {
    requestId: '1',
    sessionId: '2',
    method: RpcMethod.ETH_SEND_TRANSACTION,
    chainId: 'eip155:1',
    dappInfo: { url: 'https://example.com', name: 'dapp', icon: 'icon' },
    params: [testParams],
  },
  chain: testChain,
  approvalController: mockApprovalController,
  transactionValidation: false,
});

const displayData = {
  title: 'Approve Transaction',
  chain: {
    chainId: testChain.chainId,
    name: testChain.chainName,
    logoUrl: testChain.logoUrl,
  },
  transactionDetails: {
    website: 'example.com',
    from: '0xfrom',
    to: '0xto',
    data: '0xdata',
  },
  networkFeeSelector: true,
  transactionSimulation: undefined,
  transactionValidation: undefined,
};

const signingData = {
  type: 'transaction',
  account: '0xfrom',
  chainId: 'eip155:1',
  derivationPath: 'bip44',
  data: {
    type: 2,
    nonce: 12,
    gasLimit: 21000,
    to: '0xto',
    from: '0xfrom',
    data: '0xdata',
    value: '0xvalue',
  },
};

const providerParams = {
  chainId: 'eip155:1',
  chainName: 'chainName',
  rpcUrl: 'rpcUrl',
  multiContractAddress: 'multiContractAddress',
  glacierApiKey: undefined,
};

const testTxHash = '0xtxhash';

describe('eth_sendTransaction handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockParseRequestParams.mockReturnValue({
      success: true,
      data: [testParams],
    });

    mockApprovalController.requestApproval.mockResolvedValue({ result: testTxHash });
  });

  it('should return error if request params are invalid', async () => {
    mockParseRequestParams.mockReturnValue({
      success: false,
      error: new Error('Invalid params') as ZodError,
    });

    const response = await ethSendTransaction(testRequestParams());

    expect(response).toEqual({
      error: rpcErrors.invalidParams('Transaction params are invalid'),
    });
  });

  it('should calculate gas limit if not provided', async () => {
    mockParseRequestParams.mockReturnValue({
      success: true,
      data: [{ from: '0xfrom', to: '0xto', data: '0xdata', value: '0xvalue', nonce: '12' }],
    });
    mockEstimateGasLimit.mockResolvedValue(21000);

    const requestParams = testRequestParams();

    await ethSendTransaction(requestParams);

    expect(mockEstimateGasLimit).toHaveBeenCalledWith({
      providerParams,
      transactionParams: { from: '0xfrom', to: '0xto', data: '0xdata', value: '0xvalue' },
    });

    expect(mockApprovalController.requestApproval).toHaveBeenCalledWith({
      request: requestParams.request,
      displayData,
      signingData,
    });
  });

  it('should calculate nonce if not provided', async () => {
    mockParseRequestParams.mockReturnValue({
      success: true,
      data: [{ from: '0xfrom', to: '0xto', data: '0xdata', value: '0xvalue', gas: '0x5208' }],
    });
    mockGetNonce.mockResolvedValue(12);

    const requestParams = testRequestParams();
    await ethSendTransaction(requestParams);

    expect(mockGetNonce).toHaveBeenCalledWith({
      providerParams,
      from: '0xfrom',
    });

    expect(mockApprovalController.requestApproval).toHaveBeenCalledWith({
      request: requestParams.request,
      displayData,
      signingData,
    });
  });

  it('should calculate both gas and nonce if not provided', async () => {
    mockParseRequestParams.mockReturnValue({
      success: true,
      data: [{ from: '0xfrom', to: '0xto', data: '0xdata', value: '0xvalue' }],
    });
    mockGetNonce.mockResolvedValue(12);
    mockEstimateGasLimit.mockResolvedValue(21000);

    const requestParams = testRequestParams();
    await ethSendTransaction(requestParams);

    expect(mockGetNonce).toHaveBeenCalledWith({
      providerParams,
      from: '0xfrom',
    });

    expect(mockEstimateGasLimit).toHaveBeenCalledWith({
      providerParams,
      transactionParams: { from: '0xfrom', to: '0xto', data: '0xdata', value: '0xvalue' },
    });

    expect(mockApprovalController.requestApproval).toHaveBeenCalledWith({
      request: requestParams.request,
      displayData,
      signingData,
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

      mockApprovalController.requestApproval.mockResolvedValue({ result: testTxHash });
      mockSendRawTransaction.mockResolvedValue(testTxHash);
    });

    it('should broadcast the signed transaction and return transaction hash', async () => {
      const requestParams = testRequestParams();
      const response = await ethSendTransaction(requestParams);

      expect(mockSendRawTransaction).toHaveBeenCalledWith({ serializedTransaction: testTxHash });

      expect(response).toStrictEqual({ result: testTxHash });
    });

    it('should notify when transaction is confirmed', async () => {
      mockWaitForTransactionReceipt.mockResolvedValue({ status: 'success' });

      const requestParams = testRequestParams();
      const response = await ethSendTransaction(requestParams);

      expect(response).toStrictEqual({ result: testTxHash });

      expect(mockWaitForTransactionReceipt).toHaveBeenCalledWith({ hash: testTxHash, pollingInterval: 1_000 });

      expect(mockOnTransactionConfirmed).toHaveBeenCalledWith(testTxHash);
    });

    it('should notify when transaction is reverted', async () => {
      mockWaitForTransactionReceipt.mockResolvedValue({ status: 'reverted' });

      const requestParams = testRequestParams();
      const response = await ethSendTransaction(requestParams);

      expect(response).toStrictEqual({ result: testTxHash });

      expect(mockWaitForTransactionReceipt).toHaveBeenCalledWith({ hash: testTxHash, pollingInterval: 1_000 });

      expect(mockOnTransactionReverted).toHaveBeenCalledWith(testTxHash);
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
