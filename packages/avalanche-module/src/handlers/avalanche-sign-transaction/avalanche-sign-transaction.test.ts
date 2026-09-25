import { avmSerial, evmSerial, info, PVM, pvmSerial, UnsignedTx, utils } from '@avalabs/avalanchejs';
import { AlertType, AppName, NetworkVMType, RpcMethod, TxType } from '@avalabs/vm-module-types';
import { Avalanche } from '@avalabs/core-wallets-sdk';
import { avalancheSignTransaction } from './avalanche-sign-transaction';
import { getAddressesByIndices } from '../avalanche-send-transaction/utils/get-addresses-by-indices';
import { getProvider } from '../../utils/get-provider';
import { rpcErrors } from '@metamask/rpc-errors';
import { Network as GlacierNetwork } from '@avalabs/glacier-sdk';
import type { GetUpgradesInfoResponse } from '@avalabs/avalanchejs/dist/info/model';
import { INVALID_EXPORT_ERROR } from '../../utils/get-unsupported-export-error';

jest.mock('@avalabs/avalanchejs');
jest.mock('@avalabs/core-wallets-sdk');
jest.mock('../avalanche-send-transaction/utils/get-addresses-by-indices');
jest.mock('../../utils/get-provider');

const AVAX_ASSET_ID = 'avaxAssetId';

const mockRequestApproval = jest.fn().mockImplementation(() => ({ success: true }));
const mockApprovalController = {
  requestPublicKey: jest.fn(),
  requestApproval: mockRequestApproval,
  onTransactionPending: jest.fn(),
  onTransactionConfirmed: jest.fn(),
  onTransactionReverted: jest.fn(),
};
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
const mockNetwork = {
  chainId: 123,
  name: 'chainName',
  logoUri: 'logoUri',
  isTestnet: false,
  chainName: 'chainName',
  rpcUrl: 'rpcUrl',
  networkToken: {
    name: 'avalanche',
    symbol: 'AVAX',
    decimals: 9,
  },
  vmName: NetworkVMType.PVM,
};
const createRequest = (params: { transactionHex?: string; chainAlias?: string; from?: string }) => {
  return {
    requestId: 'requestId',
    sessionId: 'sessionId',
    method: RpcMethod.AVALANCHE_SIGN_TRANSACTION,
    chainId: 'Caip2ChainId',
    params,
    dappInfo: {
      name: 'name',
      action: `dapp requests you to sign the following transaction`,
      logoUri: 'logoUri',
      url: 'url',
      icon: 'icon',
    },
    context: {
      currentAddress: 'C-avax1234567890',
      currentEvmAddress: '0x0',
      xpubXP: 'xpubXP',
    },
  };
};

const avalancheSignTransactionParams = {
  network: mockNetwork,
  approvalController: mockApprovalController,
  glacierApiUrl: 'glacierApiUrl',
  appInfo: { name: AppName.CORE_MOBILE_IOS, version: 'version' },
};

describe('avalanche-sign-transaction', () => {
  const txBytes = new Uint8Array([0, 1, 2]);
  const txMock = {
    getSigIndices: jest.fn(),
  };
  const signerAddressBytesMock = new Uint8Array([3, 4, 5]);
  const signerAddressMock = { foo: 'bar' };
  const unsignedTxJson = { biz: 'baz' };
  const unsignedTxMock = {
    getSigIndicesForAddress: jest.fn(),
    getSigIndices: jest.fn(),
    toJSON: jest.fn(),
    getInputUtxos: jest.fn(),
    getTx: jest.fn(),
  };
  const codecManagerMock = {
    unpack: jest.fn(),
  };
  beforeEach(() => {
    jest.resetAllMocks();
    (getAddressesByIndices as jest.Mock).mockResolvedValue([]);
    (avmSerial.isExportTx as unknown as jest.Mock).mockImplementation((tx) => tx?._type === 'avm.ExportTx');
    (pvmSerial.isExportTx as unknown as jest.Mock).mockImplementation((tx) => tx?._type === 'pvm.ExportTx');
    (evmSerial.isExportTx as unknown as jest.Mock).mockImplementation((tx) => tx?._type === 'evm.ExportTx');
    unsignedTxMock.getTx.mockReturnValue({ foo: 'bar' });
    (getProvider as jest.MockedFunction<typeof getProvider>).mockResolvedValue({
      getContext: () => ({ avaxAssetID: AVAX_ASSET_ID }),
    } as unknown as Avalanche.JsonRpcProvider);

    jest.spyOn(info.InfoApi.prototype, 'getUpgradesInfo').mockResolvedValue({} as GetUpgradesInfoResponse);
    (UnsignedTx.fromJSON as jest.Mock).mockReturnValue(unsignedTxMock);
    (Avalanche.getVmByChainAlias as jest.Mock).mockReturnValue(PVM);
    (Avalanche.createAvalancheUnsignedTx as jest.Mock).mockReturnValue(unsignedTxMock);
    (Avalanche.parseAvalancheTx as jest.Mock).mockReturnValue({
      ...emptyValueDetails,
      type: TxType.AddPermissionlessDelegator,
      start: '0',
      end: '1000',
    });
    (utils.hexToBuffer as jest.Mock).mockReturnValue(txBytes);
    (utils.unpackWithManager as jest.Mock).mockReturnValue(txMock);
    (utils.addressesFromBytes as jest.Mock).mockReturnValue([signerAddressMock]);
    (utils.parse as jest.Mock).mockReturnValue([undefined, undefined, signerAddressBytesMock]);
    (utils.getManagerForVM as jest.Mock).mockReturnValue(codecManagerMock);
    txMock.getSigIndices.mockReturnValue([0]);
    unsignedTxMock.toJSON.mockReturnValue(unsignedTxJson);
    unsignedTxMock.getSigIndicesForAddress.mockReturnValue([[0, 0]]);
    unsignedTxMock.getSigIndices.mockReturnValue([[0, 0]]);
    (Avalanche.getUtxosByTxFromGlacier as jest.Mock).mockReturnValue(utxosMock);
    jest.spyOn(info.InfoApi.prototype, 'getUpgradesInfo').mockRejectedValue(() => Promise.reject({}));
  });

  it('fallbacks to current address if from address was not provided', async () => {
    const request = createRequest({ transactionHex: '0x00001', chainAlias: 'P' });
    mockRequestApproval.mockResolvedValue({ signedData: 'signedData' });
    const result = await avalancheSignTransaction({
      ...avalancheSignTransactionParams,
      request,
    });
    expect(utils.parse).toHaveBeenCalledWith('C-avax1234567890');

    expect(result).toEqual({
      result: 'signedData',
    });
  });

  it('merges resolved auth headers into the Glacier UTXO request', async () => {
    const request = createRequest({ transactionHex: '0x00001', chainAlias: 'P' });
    mockRequestApproval.mockResolvedValue({ signedData: 'signedData' });

    await avalancheSignTransaction({
      ...avalancheSignTransactionParams,
      request,
      getAuthHeaders: jest.fn().mockResolvedValue({ 'X-Firebase-AppCheck': 'appcheck-token' }),
    });

    expect(Avalanche.getUtxosByTxFromGlacier).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'glacierApiUrl',
        headers: {
          'x-application-name': 'core-mobile-ios',
          'x-application-version': 'version',
          'X-Firebase-AppCheck': 'appcheck-token',
        },
      }),
    );
  });

  it('returns error if missing signer address', async () => {
    const request = createRequest({ transactionHex: '0x00001', chainAlias: 'P', from: '123' });
    (utils.addressesFromBytes as jest.Mock).mockReturnValue([]);

    const result = await avalancheSignTransaction({
      ...avalancheSignTransactionParams,
      request,
    });

    expect(result).toEqual({
      error: rpcErrors.invalidParams('Missing signer address'),
    });
  });

  it('returns error if no own signature indices', async () => {
    const request = createRequest({ transactionHex: '0x00001', chainAlias: 'P', from: '123' });
    unsignedTxMock.getSigIndicesForAddress.mockReturnValue([]);

    const result = await avalancheSignTransaction({
      ...avalancheSignTransactionParams,
      request,
    });

    expect(result).toEqual({
      error: rpcErrors.invalidParams('This account has nothing to sign'),
    });
  });

  it('returns error if this account has nothing to sign', async () => {
    const request = createRequest({ transactionHex: '0x00001', chainAlias: 'P', from: '123' });
    unsignedTxMock.getSigIndices.mockReturnValue([]);

    const result = await avalancheSignTransaction({
      ...avalancheSignTransactionParams,
      request,
    });

    expect(result).toEqual({
      error: rpcErrors.invalidParams('This account has nothing to sign'),
    });
  });

  it('returns error if the tx type is unknown', async () => {
    const request = createRequest({ transactionHex: '0x00001', chainAlias: 'P', from: '123' });
    (Avalanche.parseAvalancheTx as jest.Mock).mockReturnValue({
      ...emptyValueDetails,
      type: TxType.Unknown,
    });

    const result = await avalancheSignTransaction({
      ...avalancheSignTransactionParams,
      request,
    });

    expect(result).toEqual({
      error: rpcErrors.invalidParams('Unable to parse transaction data. Unsupported tx type'),
    });
  });

  it('returns error if there is error in response', async () => {
    const request = createRequest({ transactionHex: '0x00001', chainAlias: 'P', from: '123' });
    mockRequestApproval.mockResolvedValue({ error: 'error' });
    const result = await avalancheSignTransaction({
      ...avalancheSignTransactionParams,
      request,
    });

    expect(result).toEqual({
      error: 'error',
    });
  });

  it('returns error if there is no signedData in response', async () => {
    const request = createRequest({ transactionHex: '0x00001', chainAlias: 'P', from: '123' });
    mockRequestApproval.mockResolvedValue({});
    const result = await avalancheSignTransaction({
      ...avalancheSignTransactionParams,
      request,
    });

    expect(result).toEqual({
      error: rpcErrors.invalidRequest('No signed data returned'),
    });
  });

  it('returns result if there is signedData in response', async () => {
    const request = createRequest({ transactionHex: '0x00001', chainAlias: 'P', from: '123' });
    mockRequestApproval.mockResolvedValue({ signedData: 'signedData' });
    const result = await avalancheSignTransaction({
      ...avalancheSignTransactionParams,
      request,
    });

    expect(result).toEqual({
      result: 'signedData',
    });
  });

  it('returns burn amount checker warning properly when isValidAvaxBurnedAmount is false', async () => {
    (Avalanche.parseAvalancheTx as jest.Mock).mockReturnValue({
      ...emptyValueDetails,
      isValidAvaxBurnedAmount: false,
      type: TxType.AddPermissionlessDelegator,
      start: '0',
      end: '1000',
    });
    mockRequestApproval.mockResolvedValue({ signedData: 'signedData' });

    await avalancheSignTransaction({
      ...avalancheSignTransactionParams,
      request: createRequest({ transactionHex: '0x00001', chainAlias: 'P', from: '123' }),
    });

    expect(mockRequestApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        displayData: expect.objectContaining({ alert: expect.objectContaining({ type: AlertType.WARNING }) }),
      }),
    );
  });

  it('does not return burn amount checker warning when isValidAvaxBurnedAmount is true', async () => {
    mockRequestApproval.mockResolvedValue({ signedData: 'signedData' });

    await avalancheSignTransaction({
      ...avalancheSignTransactionParams,
      request: createRequest({ transactionHex: '0x00001', chainAlias: 'P', from: '123' }),
    });

    expect(mockRequestApproval).toHaveBeenCalledWith(
      expect.objectContaining({ displayData: expect.objectContaining({ alert: undefined }) }),
    );
  });

  it('returns an error if the export to C contains any non-AVAX assets', async () => {
    (Avalanche.parseAvalancheTx as jest.Mock).mockReturnValue({
      ...emptyValueDetails,
      type: TxType.Export,
      chain: NetworkVMType.AVM,
      destination: NetworkVMType.EVM,
    });
    unsignedTxMock.getTx.mockReturnValue({ _type: 'avm.ExportTx', outs: [{ getAssetId: () => 'someOtherAsset' }] });

    const result = await avalancheSignTransaction({
      ...avalancheSignTransactionParams,
      request: createRequest({ transactionHex: '0x00001', chainAlias: 'X', from: '123' }),
    });

    expect(result.error?.message).toContain(INVALID_EXPORT_ERROR);
    expect(mockRequestApproval).not.toHaveBeenCalled();
  });

  it('returns an error if the export from C contains any non-AVAX assets', async () => {
    (Avalanche.parseAvalancheTx as jest.Mock).mockReturnValue({
      ...emptyValueDetails,
      type: TxType.Export,
      chain: NetworkVMType.EVM,
      destination: NetworkVMType.AVM,
    });
    unsignedTxMock.getTx.mockReturnValue({
      _type: 'evm.ExportTx',
      exportedOutputs: [{ getAssetId: () => 'someOtherAsset' }],
    });

    const result = await avalancheSignTransaction({
      ...avalancheSignTransactionParams,
      request: createRequest({ transactionHex: '0x00001', chainAlias: 'C', from: 'C-avax1234567890' }),
    });

    expect(result.error?.message).toContain(INVALID_EXPORT_ERROR);
    expect(mockRequestApproval).not.toHaveBeenCalled();
  });

  it('works as expected for an AVAX only export from C', async () => {
    (Avalanche.parseAvalancheTx as jest.Mock).mockReturnValue({
      ...emptyValueDetails,
      type: TxType.Export,
      chain: NetworkVMType.EVM,
      destination: NetworkVMType.AVM,
    });
    unsignedTxMock.getTx.mockReturnValue({
      _type: 'evm.ExportTx',
      exportedOutputs: [{ getAssetId: () => AVAX_ASSET_ID }],
    });
    mockRequestApproval.mockResolvedValue({ signedData: 'signedData' });

    await avalancheSignTransaction({
      ...avalancheSignTransactionParams,
      request: createRequest({ transactionHex: '0x00001', chainAlias: 'C', from: 'C-avax1234567890' }),
    });

    expect(mockRequestApproval).toHaveBeenCalled();
  });

  it('works as expected for an AVAX only export to C from X', async () => {
    (Avalanche.parseAvalancheTx as jest.Mock).mockReturnValue({
      ...emptyValueDetails,
      type: TxType.Export,
      chain: NetworkVMType.AVM,
      destination: NetworkVMType.EVM,
    });
    unsignedTxMock.getTx.mockReturnValue({ _type: 'avm.ExportTx', outs: [{ getAssetId: () => AVAX_ASSET_ID }] });
    mockRequestApproval.mockResolvedValue({ signedData: 'signedData' });

    await avalancheSignTransaction({
      ...avalancheSignTransactionParams,
      request: createRequest({ transactionHex: '0x00001', chainAlias: 'X', from: '123' }),
    });

    expect(mockRequestApproval).toHaveBeenCalled();
  });

  it('works as expected for an AVAX only export to C from P', async () => {
    (Avalanche.parseAvalancheTx as jest.Mock).mockReturnValue({
      ...emptyValueDetails,
      type: TxType.Export,
      chain: NetworkVMType.AVM,
      destination: NetworkVMType.PVM,
    });
    unsignedTxMock.getTx.mockReturnValue({ _type: 'avm.ExportTx', outs: [{ getAssetId: () => 'someOtherAsset' }] });
    mockRequestApproval.mockResolvedValue({ signedData: 'signedData' });

    await avalancheSignTransaction({
      ...avalancheSignTransactionParams,
      request: createRequest({ transactionHex: '0x00001', chainAlias: 'X', from: '123' }),
    });

    expect(mockRequestApproval).toHaveBeenCalled();
  });

  it('works with EVM export transactions', async () => {
    const request = createRequest({ transactionHex: '0x00001', chainAlias: 'C', from: 'C-avax1234567890' });
    mockRequestApproval.mockResolvedValue({ signedData: 'signedData' });
    const result = await avalancheSignTransaction({
      ...avalancheSignTransactionParams,
      request,
    });

    expect(result).toEqual({
      result: 'signedData',
    });
  });

  it('sends only the core headers when no auth header resolver is given', async () => {
    const request = createRequest({ transactionHex: '0x00001', chainAlias: 'P', from: '123' });
    mockRequestApproval.mockResolvedValue({ signedData: 'signedData' });

    await avalancheSignTransaction({
      ...avalancheSignTransactionParams,
      request,
    });

    expect(Avalanche.getUtxosByTxFromGlacier).toHaveBeenCalledWith({
      transactionHex: '0x00001',
      chainAlias: 'P',
      network: GlacierNetwork.MAINNET,
      url: 'glacierApiUrl',
      headers: {
        'x-application-name': 'core-mobile-ios',
        'x-application-version': 'version',
      },
    });
  });
});
