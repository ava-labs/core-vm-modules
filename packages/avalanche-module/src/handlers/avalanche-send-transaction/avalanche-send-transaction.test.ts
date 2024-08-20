import { rpcErrors } from '@metamask/rpc-errors';
import { UnsignedTx, EVMUnsignedTx, AVM, utils, EVM } from '@avalabs/avalanchejs';
import { NetworkVMType, RpcMethod, type ApprovalController, type Network } from '@avalabs/vm-module-types';
import { avalancheSendTransaction } from './avalanche-send-transaction';
import { Avalanche } from '@avalabs/core-wallets-sdk';
import { getAddressesByIndices } from './utils/get-addresses-by-indices';
import { getProvider } from '../../utils/get-provider';
import { retry } from '@internal/utils/src/utils/retry';

const GLACIER_API_URL = 'https://glacier-api.avax.network';

jest.mock('@avalabs/core-wallets-sdk');
jest.mock('@avalabs/avalanchejs');
jest.mock('./utils/get-addresses-by-indices');
jest.mock('../../utils/get-provider');
jest.mock('@internal/utils/src/utils/retry', () => ({
  retry: jest.fn(),
}));

const utxosMock = [{ utxoId: '1' }, { utxoId: '2' }];

const mockOnTransactionConfirmed = jest.fn();
const mockOnTransactionReverted = jest.fn();
const mockApprovalController: jest.Mocked<ApprovalController> = {
  requestApproval: jest.fn(),
  onTransactionConfirmed: mockOnTransactionConfirmed,
  onTransactionReverted: mockOnTransactionReverted,
};

const mockGetAddressesByIndices = getAddressesByIndices as jest.MockedFunction<typeof getAddressesByIndices>;

const issueTxHexMock = jest.fn();
const mockGetTxStatus = jest.fn().mockResolvedValue({ status: 'Accepted' });
const mockWaitForTransaction = jest.fn().mockResolvedValue({ status: '1' });

const mockGetApiP = jest.fn().mockReturnValue({
  getTxStatus: mockGetTxStatus,
});

const mockRetry = retry as jest.MockedFunction<typeof retry>;

const mockGetProvider = getProvider as jest.MockedFunction<typeof getProvider>;

const mockProvider = {
  issueTxHex: issueTxHexMock,
  getApiP: mockGetApiP,
  evmRpc: {
    waitForTransaction: mockWaitForTransaction,
  },
} as unknown as Avalanche.JsonRpcProvider;

mockGetProvider.mockReturnValue(mockProvider);
const getAddressesMock = jest.fn();
const hasAllSignaturesMock = jest.fn();
const unsignedTxJson = { foo: 'bar' };
const unsignedTxMock = {
  addressMaps: {
    getAddresses: getAddressesMock,
  },
  hasAllSignatures: hasAllSignaturesMock,
  toJSON: () => unsignedTxJson,
  getSignedTx: () => 'signedTx',
  getTx: () => ({
    foo: 'bar',
  }),
};

const testNetwork: Network = {
  isTestnet: true,
  chainId: 1,
  chainName: 'chainName',
  rpcUrl: 'rpcUrl',
  logoUri: 'logoUri',
  utilityAddresses: { multicall: 'multiContractAddress' },
  networkToken: {
    name: 'Avalanche',
    symbol: 'AVAX',
    decimals: 9,
    description: 'Avalanche Token',
    logoUri: 'some logo uri',
  },
  vmName: NetworkVMType.EVM,
};

const testRequestParams = { transactionHex: '0x00001', chainAlias: 'X' as const };

const testRequest = (requestParams: {
  transactionHex: string;
  chainAlias: 'C' | 'X' | 'P';
  externalIndices?: number[];
  internalIndices?: number[];
}) => ({
  requestId: '1',
  sessionId: '2',
  method: RpcMethod.AVALANCHE_SEND_TRANSACTION,
  chainId: 'avax:testnet',
  dappInfo: { url: 'https://example.com', name: 'dapp', icon: 'icon' },
  params: requestParams,
  context: {
    currentAddress: '0x0',
    xpubXP: 'xpubXP',
  },
});

const testParams = (requestParams: {
  transactionHex: string;
  chainAlias: 'C' | 'X' | 'P';
  externalIndices?: number[];
  internalIndices?: number[];
}) => ({
  request: testRequest(requestParams),
  network: testNetwork,
  approvalController: mockApprovalController,
  glacierApiUrl: GLACIER_API_URL,
});

const testSignedTxHash = '0xsignedtxhash';
const testTxHash = '0xtxhash';

describe('avalanche_sendTransaction handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (UnsignedTx.fromJSON as jest.Mock).mockReturnValue(unsignedTxMock);
    (EVMUnsignedTx.fromJSON as jest.Mock).mockReturnValue(unsignedTxMock);
    mockGetAddressesByIndices.mockResolvedValue([]);
    issueTxHexMock.mockResolvedValue({ txID: testTxHash });
    (Avalanche.getVmByChainAlias as jest.Mock).mockReturnValue(AVM);
    (Avalanche.createAvalancheUnsignedTx as jest.Mock).mockReturnValue(unsignedTxMock);
    (Avalanche.getUtxosByTxFromGlacier as jest.Mock).mockReturnValue(utxosMock);
  });

  it('should return error if transactionHex was not provided', async () => {
    const requestParams = {
      ...testRequestParams,
      transactionHex: undefined,
    };

    // @ts-expect-error for testing when transactionHex is missing
    const result = await avalancheSendTransaction(testParams(requestParams));

    expect(result).toEqual({
      error: rpcErrors.invalidParams('Transaction params are invalid'),
    });
  });

  it('should return error if chainAlias was not provided', async () => {
    const requestParams = {
      ...testRequestParams,
      chainAlias: 'undefined',
    };

    // @ts-expect-error for testing when chainAlias is missing
    const result = await avalancheSendTransaction(testParams(requestParams));

    expect(result).toEqual({
      error: rpcErrors.invalidParams('Transaction params are invalid'),
    });
  });

  it('should return error if currentAddress is not provided in context', async () => {
    const params = testParams(testRequestParams);
    const paramsWithoutCurrentAddress = {
      ...params,
      request: {
        ...params.request,
        context: {
          ...params.request.context,
          currentAddress: undefined,
        },
      },
    };

    const result = await avalancheSendTransaction(paramsWithoutCurrentAddress);

    expect(result).toEqual({
      error: rpcErrors.invalidParams('No active account found'),
    });
  });

  it('should return error if xpubXP is not provided in context', async () => {
    const params = testParams(testRequestParams);
    const paramsWithoutCurrentAddress = {
      ...params,
      request: {
        ...params.request,
        context: {
          ...params.request.context,
          xpubXP: undefined,
        },
      },
    };

    const result = await avalancheSendTransaction(paramsWithoutCurrentAddress);

    expect(result).toEqual({
      error: rpcErrors.invalidParams('Request should have xpubXP in context'),
    });
  });

  it('should return error if fails to parse transaction', async () => {
    (Avalanche.parseAvalancheTx as jest.Mock).mockReturnValueOnce({
      type: 'unknown',
    });
    (utils.parse as jest.Mock).mockReturnValueOnce([undefined, undefined, new Uint8Array([0, 1, 2])]);

    const params = testParams(testRequestParams);

    const result = await avalancheSendTransaction(params);

    expect(result).toEqual({
      error: rpcErrors.invalidParams('Unable to parse transaction data. Unsupported tx type'),
    });
  });

  it('X/P: should process transaction with proper displayData', async () => {
    const params = testParams(testRequestParams);
    const tx = { vm: AVM };

    (utils.unpackWithManager as jest.Mock).mockReturnValueOnce(tx);
    (Avalanche.parseAvalancheTx as jest.Mock).mockReturnValueOnce({
      type: 'import',
    });
    (utils.parse as jest.Mock).mockReturnValueOnce([undefined, undefined, new Uint8Array([0, 1, 2])]);

    await avalancheSendTransaction(params);

    expect(Avalanche.getUtxosByTxFromGlacier).toHaveBeenCalledWith({
      transactionHex: '0x00001',
      chainAlias: 'X',
      isTestnet: true,
      url: GLACIER_API_URL,
      token: undefined,
    });

    expect(Avalanche.createAvalancheUnsignedTx).toHaveBeenCalledWith({
      tx,
      utxos: utxosMock,
      provider: mockProvider,
      fromAddressBytes: [new Uint8Array([0, 1, 2])],
    });

    expect(mockApprovalController.requestApproval).toHaveBeenCalledWith({
      request: {
        requestId: '1',
        sessionId: '2',
        method: 'avalanche_sendTransaction',
        chainId: 'avax:testnet',
        dappInfo: { url: 'https://example.com', name: 'dapp', icon: 'icon' },
        params: { transactionHex: '0x00001', chainAlias: 'X' },
        context: { currentAddress: '0x0', xpubXP: 'xpubXP' },
      },
      displayData: {
        title: 'Approve Import',
        network: { chainId: 1, name: 'chainName', logoUri: 'logoUri' },
        details: [
          {
            title: 'Transaction Details',
            items: [
              {
                label: 'Source Chain',
                alignment: 'horizontal',
                type: 'text',
                value: 'Avalanche undefined',
              },
              {
                label: 'Destination Chain',
                alignment: 'horizontal',
                type: 'text',
                value: 'Avalanche undefined',
              },
              {
                label: 'Transaction Type',
                alignment: 'horizontal',
                type: 'text',
                value: 'Import',
              },
              {
                label: 'Amount',
                type: 'currency',
                value: undefined,
                maxDecimals: 9,
                symbol: 'AVAX',
              },
            ],
          },
        ],
        networkFeeSelector: false,
      },
      signingData: {
        type: 'avalanche_sendTransaction',
        unsignedTxJson: '{"foo":"bar"}',
        data: { type: 'import' },
        vm: 'AVM',
      },
    });
  });

  it('C: should process transaction with proper displayData', async () => {
    const transactionHex = '0x00001';
    const chainAlias = 'C';
    const params = testParams({ transactionHex, chainAlias });
    (Avalanche.getVmByChainAlias as jest.Mock).mockReturnValue(EVM);
    (utils.hexToBuffer as jest.Mock).mockReturnValueOnce(new Uint8Array([0, 1, 2]));
    (utils.parse as jest.Mock).mockReturnValueOnce([undefined, undefined, new Uint8Array([0, 1, 2])]);
    (Avalanche.parseAvalancheTx as jest.Mock).mockReturnValueOnce({
      type: 'import',
    });
    (Avalanche.createAvalancheEvmUnsignedTx as jest.Mock).mockReturnValueOnce(unsignedTxMock);
    (utils.parse as jest.Mock).mockReturnValue([]);

    await avalancheSendTransaction(params);

    expect(mockApprovalController.requestApproval).toHaveBeenCalledWith({
      request: {
        requestId: '1',
        sessionId: '2',
        method: 'avalanche_sendTransaction',
        chainId: 'avax:testnet',
        dappInfo: { url: 'https://example.com', name: 'dapp', icon: 'icon' },
        params: { transactionHex: '0x00001', chainAlias: 'C' },
        context: { currentAddress: '0x0', xpubXP: 'xpubXP' },
      },
      displayData: {
        title: 'Approve Import',
        network: { chainId: 1, name: 'chainName', logoUri: 'logoUri' },
        details: [
          {
            title: 'Transaction Details',
            items: [
              {
                label: 'Source Chain',
                alignment: 'horizontal',
                type: 'text',
                value: 'Avalanche undefined',
              },
              {
                label: 'Destination Chain',
                alignment: 'horizontal',
                type: 'text',
                value: 'Avalanche undefined',
              },
              {
                label: 'Transaction Type',
                alignment: 'horizontal',
                type: 'text',
                value: 'Import',
              },
              {
                label: 'Amount',
                type: 'currency',
                value: undefined,
                maxDecimals: 9,
                symbol: 'AVAX',
              },
            ],
          },
        ],
        networkFeeSelector: false,
      },
      signingData: {
        type: 'avalanche_sendTransaction',
        unsignedTxJson: '{"foo":"bar"}',
        data: { type: 'import' },
        vm: 'EVM',
      },
    });

    expect(Avalanche.getUtxosByTxFromGlacier).toHaveBeenCalledWith({
      transactionHex: transactionHex,
      chainAlias: chainAlias,
      isTestnet: true,
      url: GLACIER_API_URL,
      token: undefined,
    });

    expect(Avalanche.createAvalancheEvmUnsignedTx).toHaveBeenCalledWith({
      txBytes: new Uint8Array([0, 1, 2]),
      vm: EVM,
      utxos: utxosMock,
      fromAddress: '0x0',
    });
  });

  describe('approve succeeds', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      (Avalanche.parseAvalancheTx as jest.Mock).mockReturnValueOnce({
        type: 'import',
      });

      mockApprovalController.requestApproval.mockResolvedValue({ signedData: testSignedTxHash });
    });

    it('should sign transactions correctly on X/P', async () => {
      const params = testParams(testRequestParams);
      const response = await avalancheSendTransaction(params);

      expect(mockGetProvider).toHaveBeenCalledWith({ isTestnet: true });

      expect(issueTxHexMock).toHaveBeenCalledWith(testSignedTxHash, 'AVM');

      expect(response).toStrictEqual({ result: testTxHash });
    });

    it('should sign transactions correctly on X/P with multiple addresses', async () => {
      getAddressesMock.mockReturnValueOnce(['addr1', 'addr2']);
      const params = testParams({
        transactionHex: '0x00001',
        chainAlias: 'X',
        externalIndices: [0, 1],
        internalIndices: [2, 3],
      });
      const response = await avalancheSendTransaction(params);

      expect(mockGetProvider).toHaveBeenCalledWith({ isTestnet: true });

      expect(issueTxHexMock).toHaveBeenCalledWith(testSignedTxHash, 'AVM');

      expect(response).toEqual({ result: testTxHash });
    });

    it('should sign transactions correctly on C', async () => {
      (Avalanche.createAvalancheEvmUnsignedTx as jest.Mock).mockReturnValueOnce(unsignedTxMock);
      (Avalanche.getVmByChainAlias as jest.Mock).mockReturnValue(EVM);

      const params = testParams({ transactionHex: '0x000142', chainAlias: 'C' });
      const response = await avalancheSendTransaction(params);

      expect(mockGetProvider).toHaveBeenCalledWith({ isTestnet: true });

      expect(issueTxHexMock).toHaveBeenCalledWith(testSignedTxHash, 'EVM');

      expect(response).toEqual({ result: testTxHash });
    });

    it('should notify when transaction is confirmed', async () => {
      const params = testParams(testRequestParams);
      const response = await avalancheSendTransaction(params);

      expect(mockGetProvider).toHaveBeenCalledWith({ isTestnet: true });

      expect(response).toStrictEqual({ result: testTxHash });

      expect(mockOnTransactionConfirmed).toHaveBeenCalledWith(testTxHash);
    });

    it('should notify when transaction is reverted', async () => {
      mockGetTxStatus.mockResolvedValue({ status: 'Error' });
      mockRetry.mockImplementation(() => {
        throw new Error('Mocked error');
      });

      const params = testParams(testRequestParams);

      const response = await avalancheSendTransaction(params);

      expect(mockGetProvider).toHaveBeenCalledWith({ isTestnet: true });

      expect(response).toStrictEqual({ result: testTxHash });

      expect(mockOnTransactionReverted).toHaveBeenCalledWith(testTxHash);
    });
  });

  describe('approval fails', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      (Avalanche.parseAvalancheTx as jest.Mock).mockReturnValueOnce({
        type: 'import',
      });
    });

    it('should return error', async () => {
      mockApprovalController.requestApproval.mockResolvedValue({ error: rpcErrors.internal('something went wrong') });

      const params = testParams(testRequestParams);
      const response = await avalancheSendTransaction(params);

      expect(response).toStrictEqual({ error: rpcErrors.internal('something went wrong') });
    });
  });
});
