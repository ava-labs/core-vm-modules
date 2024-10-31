import { Info, PVM, UnsignedTx, utils } from '@avalabs/avalanchejs';
import { AppName, NetworkVMType, RpcMethod, TxType } from '@avalabs/vm-module-types';
import { Avalanche } from '@avalabs/core-wallets-sdk';
import { avalancheSignTransaction } from './avalanche-sign-transaction';
import { rpcErrors } from '@metamask/rpc-errors';
import type { GetUpgradesInfoResponse } from '@avalabs/avalanchejs/dist/info/model';

jest.mock('@avalabs/avalanchejs');
jest.mock('@avalabs/core-wallets-sdk');

const mockRequestApproval = jest.fn().mockImplementation(() => ({ success: true }));
const mockApprovalController = {
  requestApproval: mockRequestApproval,
  onTransactionConfirmed: jest.fn(),
  onTransactionReverted: jest.fn(),
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
    getTx: () => ({
      foo: 'bar',
    }),
  };
  const codecManagerMock = {
    unpack: jest.fn(),
  };
  beforeEach(() => {
    jest.resetAllMocks();

    jest.spyOn(Info.prototype, 'getUpgradesInfo').mockResolvedValue({} as GetUpgradesInfoResponse);
    (UnsignedTx.fromJSON as jest.Mock).mockReturnValue(unsignedTxMock);
    (Avalanche.getVmByChainAlias as jest.Mock).mockReturnValue(PVM);
    (Avalanche.createAvalancheUnsignedTx as jest.Mock).mockReturnValue(unsignedTxMock);
    (Avalanche.parseAvalancheTx as jest.Mock).mockReturnValue({
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
  });

  it('returns error if from address was not provided', async () => {
    const request = createRequest({ transactionHex: '0x00001', chainAlias: 'P' });

    const result = await avalancheSignTransaction({
      request,
      network: mockNetwork,
      approvalController: mockApprovalController,
      glacierApiUrl: 'glacierApiUrl',
      appInfo: { name: AppName.CORE_MOBILE_IOS, version: 'version' },
    });

    expect(result).toEqual({
      error: rpcErrors.invalidParams('Params are invalid'),
    });
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
    (Avalanche.parseAvalancheTx as jest.Mock).mockReturnValue({ type: TxType.Unknown });

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
});
