import { rpcErrors } from '@metamask/rpc-errors';
import { avmSerial, UnsignedTx, EVMUnsignedTx, AVM, evmSerial, pvmSerial, utils, EVM } from '@avalabs/avalanchejs';
import {
  AlertType,
  AppName,
  NetworkVMType,
  RpcMethod,
  type ApprovalController,
  type Network,
} from '@avalabs/vm-module-types';
import { avalancheSendTransaction } from './avalanche-send-transaction';
import { Avalanche } from '@avalabs/core-wallets-sdk';
import { getAddressesByIndices } from './utils/get-addresses-by-indices';
import { getProvider } from '../../utils/get-provider';
import { retry } from '@internal/utils/src/utils/retry';
import { INVALID_EXPORT_ERROR } from '../../utils/get-unsupported-export-error';
import * as signerAddresses from '../../utils/get-signer-addresses';
import * as spendDetails from '../../utils/get-transaction-spend-details';

const GLACIER_API_URL = 'https://glacier-api.avax.network';
const AVAX_ASSET_ID = 'avaxAssetId';

jest.mock('@avalabs/core-wallets-sdk');
jest.mock('@avalabs/avalanchejs');
jest.mock('./utils/get-addresses-by-indices');
jest.mock('../../utils/get-provider');
jest.mock('@internal/utils/src/utils/retry', () => ({
  retry: jest.fn(),
}));

const emptyValueDetails = {
  outputs: [],
  inputAmounts: {},
  outputAmounts: {},
  totalAvaxInput: 0n,
  totalAvaxOutput: 0n,
  totalAvaxBurned: 0n,
  isValidAvaxBurnedAmount: true,
};

const utxosMock = [{ utxoId: '1' }, { utxoId: '2' }];

const mockOnTransactionConfirmed = jest.fn();
const mockOnTransactionReverted = jest.fn();
const mockOnTransactionPending = jest.fn();
const mockOnTransactionStatusUnknown = jest.fn();
const mockApprovalController: jest.Mocked<ApprovalController> = {
  requestApproval: jest.fn(),
  requestPublicKey: jest.fn(),
  onTransactionPending: mockOnTransactionPending,
  onTransactionConfirmed: mockOnTransactionConfirmed,
  onTransactionReverted: mockOnTransactionReverted,
  onTransactionStatusUnknown: mockOnTransactionStatusUnknown,
};

const mockGetAddressesByIndices = getAddressesByIndices as jest.MockedFunction<typeof getAddressesByIndices>;

const issueTxHexMock = jest.fn();
const mockGetTxStatus = jest.fn().mockResolvedValue({ status: 'Accepted' });
const mockWaitForTransaction = jest.fn().mockResolvedValue({ status: '1' });

const mockGetApiP = jest.fn().mockReturnValue({
  getTxStatus: mockGetTxStatus,
});

const mockGetAtomicTx = jest.fn().mockResolvedValue({ blockHeight: 58717503n });
const mockGetApiC = jest.fn().mockReturnValue({
  getAtomicTx: mockGetAtomicTx,
});

const mockRetry = retry as jest.MockedFunction<typeof retry>;

const mockGetProvider = getProvider as jest.MockedFunction<typeof getProvider>;

const mockProvider = {
  issueTxHex: issueTxHexMock,
  getApiP: mockGetApiP,
  getApiC: mockGetApiC,
  getContext: () => ({ avaxAssetID: AVAX_ASSET_ID }),
  evmRpc: {
    waitForTransaction: mockWaitForTransaction,
  },
} as unknown as Avalanche.JsonRpcProvider;

mockGetProvider.mockResolvedValue(mockProvider);
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
  getTx: jest.fn(),
  getInputUtxos: jest.fn(),
};

const testNetwork: Network = {
  isTestnet: true,
  chainId: 1,
  chainName: 'chainName',
  rpcUrl: 'rpcUrl',
  logoUri: 'logoUri',
  explorerUrl: 'https://explorer.com',
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

const legacyContext = {
  currentAddress: '0x0',
  xpubXP: 'xpubXP',
};

const accountContext = {
  account: {
    xpAddress: '0x0',
    xpubXP: 'xpubXP',
    externalXPAddresses: [],
  },
};

const testRequest = (
  requestParams: {
    transactionHex: string;
    chainAlias: 'C' | 'X' | 'P';
    externalIndices?: number[];
    internalIndices?: number[];
  },
  context: Record<string, unknown> = accountContext,
) => ({
  requestId: '1',
  sessionId: '2',
  method: RpcMethod.AVALANCHE_SEND_TRANSACTION,
  chainId: 'avax:testnet',
  dappInfo: { url: 'https://example.com', name: 'dapp', icon: 'icon' },
  params: requestParams,
  context,
});

const testParams = (
  requestParams: {
    transactionHex: string;
    chainAlias: 'C' | 'X' | 'P';
    externalIndices?: number[];
    internalIndices?: number[];
  },
  context: Record<string, unknown> = accountContext,
) => ({
  request: testRequest(requestParams, context),
  network: testNetwork,
  approvalController: mockApprovalController,
  glacierApiUrl: GLACIER_API_URL,
  appInfo: { name: AppName.CORE_MOBILE_IOS, version: 'version' },
});

const testSignedTxHash = '0xsignedtxhash';
const testTxHash = '0xtxhash';

describe('avalanche_sendTransaction handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    unsignedTxMock.getTx.mockReturnValue({ foo: 'bar' });
    unsignedTxMock.getInputUtxos.mockReturnValue([]);
    (avmSerial.isExportTx as unknown as jest.Mock).mockImplementation((tx) => tx?._type === 'avm.ExportTx');
    (pvmSerial.isExportTx as unknown as jest.Mock).mockImplementation((tx) => tx?._type === 'pvm.ExportTx');
    (evmSerial.isExportTx as unknown as jest.Mock).mockImplementation((tx) => tx?._type === 'evm.ExportTx');
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

    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('Transaction params are invalid');
  });

  it('should return error if chainAlias was not provided', async () => {
    const requestParams = {
      ...testRequestParams,
      chainAlias: 'undefined',
    };

    // @ts-expect-error for testing when chainAlias is missing
    const result = await avalancheSendTransaction(testParams(requestParams));

    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('Transaction params are invalid');
  });

  it('should return error if xpAddress is not provided in context', async () => {
    const params = testParams(testRequestParams, { account: { ...accountContext.account, xpAddress: undefined } });
    const result = await avalancheSendTransaction(params);

    expect(result).toEqual({
      error: rpcErrors.invalidParams('XP address is required'),
    });
  });

  it('should return error if provided xpubXP is not a string', async () => {
    const params = testParams(testRequestParams, { account: { ...accountContext.account, xpubXP: {} } });

    const result = await avalancheSendTransaction(params);

    expect(result).toEqual({
      error: rpcErrors.invalidParams('xpubXP must be a string'),
    });
  });

  it('should return error if fails to parse transaction', async () => {
    (Avalanche.parseAvalancheTx as jest.Mock).mockReturnValueOnce({
      ...emptyValueDetails,
      type: 'unknown',
    });
    (utils.parse as jest.Mock).mockReturnValueOnce([undefined, undefined, new Uint8Array([0, 1, 2])]);

    const params = testParams(testRequestParams);

    const result = await avalancheSendTransaction(params);

    expect(result).toEqual({
      error: rpcErrors.internal('Unable to parse transaction data. Unsupported tx type'),
    });
  });

  it.each([
    ['legacy', legacyContext],
    ['account', accountContext],
  ])('(%s): X/P: should process transaction with proper displayData', async (_, context) => {
    const params = testParams(testRequestParams, context);
    const tx = { vm: AVM };

    (utils.unpackWithManager as jest.Mock).mockReturnValueOnce(tx);
    (Avalanche.parseAvalancheTx as jest.Mock).mockReturnValueOnce({
      ...emptyValueDetails,
      type: 'import',
    });
    (utils.parse as jest.Mock).mockReturnValueOnce([undefined, undefined, new Uint8Array([0, 1, 2])]);

    await avalancheSendTransaction(params);

    expect(Avalanche.getUtxosByTxFromGlacier).toHaveBeenCalledWith({
      transactionHex: '0x00001',
      chainAlias: 'X',
      network: 'fuji',
      url: GLACIER_API_URL,
      headers: {
        'x-application-name': 'core-mobile-ios',
        'x-application-version': 'version',
      },
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
        context,
      },
      displayData: {
        title: 'Do you approve this import?',
        network: { chainId: 1, name: 'chainName', logoUri: 'logoUri' },
        details: [
          {
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
            ],
          },
          {
            items: [
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
        data: { ...emptyValueDetails, type: 'import' },
        vm: 'AVM',
      },
    });
  });

  it.each([
    ['legacy', legacyContext],
    ['account', accountContext],
  ])('(%s): C: should process transaction with proper displayData', async (_, context) => {
    const transactionHex = '0x00001';
    const chainAlias = 'C';
    const params = testParams({ transactionHex, chainAlias }, context);
    (Avalanche.getVmByChainAlias as jest.Mock).mockReturnValue(EVM);
    (utils.hexToBuffer as jest.Mock).mockReturnValueOnce(new Uint8Array([0, 1, 2]));
    (utils.parse as jest.Mock).mockReturnValueOnce([undefined, undefined, new Uint8Array([0, 1, 2])]);
    (Avalanche.parseAvalancheTx as jest.Mock).mockReturnValueOnce({
      ...emptyValueDetails,
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
        context,
      },
      displayData: {
        title: 'Do you approve this import?',
        network: { chainId: 1, name: 'chainName', logoUri: 'logoUri' },
        details: [
          {
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
            ],
          },
          {
            items: [
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
        data: { ...emptyValueDetails, type: 'import' },
        vm: 'EVM',
      },
    });

    expect(Avalanche.getUtxosByTxFromGlacier).toHaveBeenCalledWith({
      transactionHex: transactionHex,
      chainAlias: chainAlias,
      network: 'fuji',
      url: GLACIER_API_URL,
      headers: {
        'x-application-name': 'core-mobile-ios',
        'x-application-version': 'version',
      },
    });

    expect(Avalanche.createAvalancheEvmUnsignedTx).toHaveBeenCalledWith({
      txBytes: new Uint8Array([0, 1, 2]),
      vm: EVM,
      utxos: utxosMock,
      fromAddress: '0x0',
    });
  });

  describe('spend details signer addresses', () => {
    const context = {
      account: { xpAddress: 'X-fuji1xp', evmAddress: '0xevm', xpubXP: 'xpubXP', externalXPAddresses: [] },
    };

    beforeEach(() => {
      jest
        .spyOn(signerAddresses, 'getSignerAddresses')
        .mockImplementation((addresses) => addresses.filter(Boolean) as unknown as Uint8Array[]);
      jest.spyOn(spendDetails, 'getTransactionSpendDetails');
      (Avalanche.parseAvalancheTx as jest.Mock).mockReturnValueOnce({ ...emptyValueDetails, type: 'import' });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it.each([
      ['X/P', 'X' as const, AVM],
      ['C', 'C' as const, EVM],
    ])('%s: passes the EVM address only as an EVM signer address', async (_, chainAlias, vm) => {
      (Avalanche.getVmByChainAlias as jest.Mock).mockReturnValue(vm);
      (utils.unpackWithManager as jest.Mock).mockReturnValueOnce({ vm });
      (Avalanche.createAvalancheEvmUnsignedTx as jest.Mock).mockReturnValueOnce(unsignedTxMock);

      await avalancheSendTransaction(testParams({ transactionHex: '0x00001', chainAlias }, context));

      expect(spendDetails.getTransactionSpendDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          xpSignerAddresses: expect.not.arrayContaining(['0xevm']),
          evmSignerAddresses: ['0xevm'],
        }),
      );
    });
  });

  it('returns burn amount checker warning properly when isValidAvaxBurnedAmount is false', async () => {
    const params = testParams(testRequestParams);

    (utils.unpackWithManager as jest.Mock).mockReturnValueOnce({ vm: AVM });
    (Avalanche.parseAvalancheTx as jest.Mock).mockReturnValueOnce({
      ...emptyValueDetails,
      isValidAvaxBurnedAmount: false,
      type: 'import',
    });
    (utils.parse as jest.Mock).mockReturnValueOnce([undefined, undefined, new Uint8Array([0, 1, 2])]);

    await avalancheSendTransaction(params);

    expect(mockApprovalController.requestApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        displayData: expect.objectContaining({ alert: expect.objectContaining({ type: AlertType.WARNING }) }),
      }),
    );
  });

  it('does not return burn amount checker warning when isValidAvaxBurnedAmount is true', async () => {
    const params = testParams(testRequestParams);

    (utils.unpackWithManager as jest.Mock).mockReturnValueOnce({ vm: AVM });
    (Avalanche.parseAvalancheTx as jest.Mock).mockReturnValueOnce({
      ...emptyValueDetails,
      type: 'import',
    });
    (utils.parse as jest.Mock).mockReturnValueOnce([undefined, undefined, new Uint8Array([0, 1, 2])]);

    await avalancheSendTransaction(params);

    expect(mockApprovalController.requestApproval).toHaveBeenCalledWith(
      expect.objectContaining({ displayData: expect.objectContaining({ alert: undefined }) }),
    );
  });

  it('returns an error if the export to C contains any non-AVAX assets', async () => {
    const params = testParams(testRequestParams);

    (utils.unpackWithManager as jest.Mock).mockReturnValueOnce({ vm: AVM });
    (Avalanche.parseAvalancheTx as jest.Mock).mockReturnValueOnce({
      ...emptyValueDetails,
      type: 'export',
      chain: NetworkVMType.AVM,
      destination: NetworkVMType.EVM,
    });
    (utils.parse as jest.Mock).mockReturnValueOnce([undefined, undefined, new Uint8Array([0, 1, 2])]);
    unsignedTxMock.getTx.mockReturnValue({
      _type: 'avm.ExportTx',
      outs: [{ getAssetId: () => 'someOtherAsset', output: { outputOwners: { addrs: [] } } }],
    });

    const result = await avalancheSendTransaction(params);

    expect(result.error?.message).toContain(INVALID_EXPORT_ERROR);
    expect(mockApprovalController.requestApproval).not.toHaveBeenCalled();
  });

  it('works as expected for an AVAX only export to C', async () => {
    const params = testParams(testRequestParams);

    (utils.unpackWithManager as jest.Mock).mockReturnValueOnce({ vm: AVM });
    (Avalanche.parseAvalancheTx as jest.Mock).mockReturnValueOnce({
      ...emptyValueDetails,
      type: 'export',
      chain: NetworkVMType.AVM,
      destination: NetworkVMType.EVM,
    });
    (utils.parse as jest.Mock).mockReturnValueOnce([undefined, undefined, new Uint8Array([0, 1, 2])]);
    unsignedTxMock.getTx.mockReturnValue({
      _type: 'avm.ExportTx',
      outs: [{ getAssetId: () => AVAX_ASSET_ID, output: { outputOwners: { addrs: [] } } }],
    });

    await avalancheSendTransaction(params);

    expect(mockApprovalController.requestApproval).toHaveBeenCalled();
  });

  it('merges resolved auth headers into the Glacier UTXO request', async () => {
    const params = {
      ...testParams(testRequestParams),
      getAuthHeaders: jest.fn().mockResolvedValue({ 'X-Firebase-AppCheck': 'appcheck-token' }),
    };
    const tx = { vm: AVM };

    (utils.unpackWithManager as jest.Mock).mockReturnValueOnce(tx);
    (Avalanche.parseAvalancheTx as jest.Mock).mockReturnValueOnce({
      ...emptyValueDetails,
      type: 'import',
    });
    (utils.parse as jest.Mock).mockReturnValueOnce([undefined, undefined, new Uint8Array([0, 1, 2])]);

    await avalancheSendTransaction(params);

    expect(Avalanche.getUtxosByTxFromGlacier).toHaveBeenCalledWith({
      transactionHex: '0x00001',
      chainAlias: 'X',
      network: 'fuji',
      url: GLACIER_API_URL,
      headers: {
        'x-application-name': 'core-mobile-ios',
        'x-application-version': 'version',
        'X-Firebase-AppCheck': 'appcheck-token',
      },
    });
  });

  describe('approve succeeds', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      (Avalanche.parseAvalancheTx as jest.Mock).mockReturnValueOnce({
        ...emptyValueDetails,
        type: 'import',
      });

      mockApprovalController.requestApproval.mockResolvedValue({ signedData: testSignedTxHash });
    });

    it('should sign transactions correctly on X/P', async () => {
      const params = testParams(testRequestParams);
      const response = await avalancheSendTransaction(params);

      expect(mockGetProvider).toHaveBeenCalledWith(testNetwork);

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

      expect(mockGetProvider).toHaveBeenCalledWith(testNetwork);

      expect(issueTxHexMock).toHaveBeenCalledWith(testSignedTxHash, 'AVM');

      expect(response).toEqual({ result: testTxHash });
    });

    it('should sign transactions correctly on C', async () => {
      (Avalanche.createAvalancheEvmUnsignedTx as jest.Mock).mockReturnValueOnce(unsignedTxMock);
      (Avalanche.getVmByChainAlias as jest.Mock).mockReturnValue(EVM);

      const params = testParams({ transactionHex: '0x000142', chainAlias: 'C' });
      const response = await avalancheSendTransaction(params);

      expect(mockGetProvider).toHaveBeenCalledWith(testNetwork);

      expect(issueTxHexMock).toHaveBeenCalledWith(testSignedTxHash, 'EVM');

      expect(response).toEqual({ result: testTxHash });
    });

    it('should notify when transaction is confirmed', async () => {
      (utils.parse as jest.Mock).mockReturnValueOnce([undefined, undefined, new Uint8Array([0, 1, 2])]);
      mockRetry.mockResolvedValue({ status: 'Accepted' });

      const params = testParams(testRequestParams);
      const response = await avalancheSendTransaction(params);

      expect(mockGetProvider).toHaveBeenCalledWith(testNetwork);

      expect(response).toStrictEqual({ result: testTxHash });

      expect(mockOnTransactionConfirmed).toHaveBeenCalledWith({
        txHash: testTxHash,
        explorerLink: 'https://explorer.com/tx/' + testTxHash,
        request: params.request,
      });
    });

    it('should notify when transaction is reverted', async () => {
      mockGetTxStatus.mockResolvedValue({ status: 'Error' });
      mockRetry.mockImplementation(() => {
        throw new Error('Mocked error');
      });

      const params = testParams(testRequestParams);

      const response = await avalancheSendTransaction(params);

      expect(mockGetProvider).toHaveBeenCalledWith(testNetwork);

      expect(response).toStrictEqual({ result: testTxHash });

      expect(mockOnTransactionReverted).toHaveBeenCalledWith({ request: params.request, txHash: testTxHash });
    });
  });

  describe('C-chain atomic transaction status', () => {
    // The C-chain branch polls `getAtomicTx`, whose only acceptance signal is
    // the presence of a block height. These tests drive the params handed to
    // `retry` directly because `retry` itself is mocked out for this suite.
    type RetryCall = {
      operation: (retryIndex: number) => Promise<unknown>;
      isSuccess: (result: unknown) => boolean;
    };

    const flushPromises = () => new Promise(process.nextTick);

    const lastRetryCall = () => mockRetry.mock.calls[0]?.[0] as unknown as RetryCall;

    const sendOnC = () => avalancheSendTransaction(testParams({ transactionHex: '0x000142', chainAlias: 'C' }));

    beforeEach(() => {
      jest.clearAllMocks();

      (Avalanche.parseAvalancheTx as jest.Mock).mockReturnValueOnce({ ...emptyValueDetails, type: 'import' });
      (Avalanche.createAvalancheEvmUnsignedTx as jest.Mock).mockReturnValue(unsignedTxMock);
      (Avalanche.getVmByChainAlias as jest.Mock).mockReturnValue(EVM);

      mockApprovalController.requestApproval.mockResolvedValue({ signedData: testSignedTxHash });
      mockRetry.mockResolvedValue({ blockHeight: 58717503n });
    });

    it('polls getAtomicTx rather than the deprecated getAtomicTxStatus', async () => {
      await sendOnC();
      await flushPromises();

      await lastRetryCall().operation(0);

      expect(mockGetApiC).toHaveBeenCalled();
      expect(mockGetAtomicTx).toHaveBeenCalledWith({ txID: testTxHash });
    });

    it('treats a block height as the only acceptance signal', async () => {
      await sendOnC();
      await flushPromises();

      const { isSuccess } = lastRetryCall();

      expect(isSuccess({ blockHeight: 58717503n })).toBe(true);
      // Processing and Dropped txs are both served without a block height.
      expect(isSuccess({ blockHeight: undefined })).toBe(false);
      expect(isSuccess({})).toBe(false);
    });

    it('notifies confirmation once the atomic tx reports a block height', async () => {
      const params = testParams({ transactionHex: '0x000142', chainAlias: 'C' });

      await avalancheSendTransaction(params);
      await flushPromises();

      expect(mockOnTransactionConfirmed).toHaveBeenCalledWith({
        txHash: testTxHash,
        explorerLink: 'https://explorer.com/tx/' + testTxHash,
        request: params.request,
      });
      expect(mockOnTransactionStatusUnknown).not.toHaveBeenCalled();
    });

    it('reports an unknown status when polling is exhausted', async () => {
      mockRetry.mockRejectedValue(new Error('Max retry exceeded. Error: request failed'));

      const params = testParams({ transactionHex: '0x000142', chainAlias: 'C' });

      await avalancheSendTransaction(params);
      await flushPromises();

      expect(mockOnTransactionStatusUnknown).toHaveBeenCalledWith({
        txHash: testTxHash,
        explorerLink: 'https://explorer.com/tx/' + testTxHash,
        request: params.request,
      });
      // Exhaustion is not evidence either way, so neither terminal state fires.
      expect(mockOnTransactionConfirmed).not.toHaveBeenCalled();
      expect(mockOnTransactionReverted).not.toHaveBeenCalled();
    });

    it('still reverts when the failure is not poll exhaustion', async () => {
      // The real `retry` only ever throws 'Max retry exceeded.', so a failure
      // raised before it is the reachable non-exhaustion path through the same
      // catch — mocking `retry` into some other error shape would assert
      // against something the implementation cannot actually produce.
      mockOnTransactionPending.mockImplementationOnce(() => {
        throw new Error('Boom');
      });

      const params = testParams({ transactionHex: '0x000142', chainAlias: 'C' });

      await avalancheSendTransaction(params);
      await flushPromises();

      expect(mockOnTransactionReverted).toHaveBeenCalledWith({ txHash: testTxHash, request: params.request });
      expect(mockOnTransactionStatusUnknown).not.toHaveBeenCalled();
    });

    it('stays silent when the consumer has not implemented onTransactionStatusUnknown', async () => {
      // The optional call itself is guarded by `?.` and enforced by tsc, so
      // what is worth asserting here is the behaviour: a consumer that opted
      // out hears nothing, rather than falling back to a misleading revert.
      mockRetry.mockRejectedValue(new Error('Max retry exceeded.'));

      const params = {
        ...testParams({ transactionHex: '0x000142', chainAlias: 'C' }),
        approvalController: {
          ...mockApprovalController,
          onTransactionStatusUnknown: undefined,
        } as unknown as ApprovalController,
      };

      await avalancheSendTransaction(params);
      await flushPromises();

      expect(mockOnTransactionConfirmed).not.toHaveBeenCalled();
      expect(mockOnTransactionReverted).not.toHaveBeenCalled();
    });
  });

  describe('approval fails', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      (Avalanche.parseAvalancheTx as jest.Mock).mockReturnValueOnce({
        ...emptyValueDetails,
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
