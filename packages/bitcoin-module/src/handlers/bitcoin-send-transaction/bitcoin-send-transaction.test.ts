import { bitcoinSendTransaction } from './bitcoin-send-transaction';
import { parseRequestParams } from './schema';
import { getProvider } from '../../utils/get-provider';
import { getBalances } from '../get-balances';
import { isBtcBalance } from '../../utils/is-btc-balance';
import { createTransferTx, BitcoinProvider } from '@avalabs/core-wallets-sdk';
import { NetworkVMType, RpcMethod, type ApprovalController, type Network } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';

jest.mock('./schema');
jest.mock('../../utils/get-provider');
jest.mock('../get-balances');
jest.mock('../../utils/is-btc-balance');
jest.mock('@avalabs/core-wallets-sdk', () => ({
  createTransferTx: jest.fn(),
  BitcoinProvider: jest.fn().mockImplementation(() => ({
    getNetwork: jest.fn(),
    issueRawTx: jest.fn(),
    waitForTx: jest.fn(),
  })),
}));

const mockOnTransactionConfirmed = jest.fn();
const mockOnTransactionReverted = jest.fn();
const mockRequestApproval = jest.fn();
const mockApprovalController: jest.Mocked<ApprovalController> = {
  requestApproval: mockRequestApproval,
  onTransactionConfirmed: mockOnTransactionConfirmed,
  onTransactionReverted: mockOnTransactionReverted,
};

const testDappInfo = { url: 'https://example.com', name: 'dapp', icon: 'icon' };
const testNetwork: Network = {
  isTestnet: false,
  chainId: 4503599627370475,
  chainName: 'Bitcoin',
  rpcUrl: 'rpcUrl',
  logoUri: 'logoUri',
  utilityAddresses: { multicall: '' },
  networkToken: {
    name: 'Bitcoin',
    symbol: 'BTC',
    decimals: 8,
    description: '',
    logoUri: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png',
  },
  vmName: NetworkVMType.BITCOIN,
};

const PROXY_API_URL = 'https://proxy-api.avax.network';

const testParams = { from: 'from', to: 'to', amount: 1, feeRate: 1 };

const testRequestParams = () => ({
  request: {
    requestId: '1',
    sessionId: '2',
    method: RpcMethod.BITCOIN_SEND_TRANSACTION,
    chainId: 'bip122:000000000019d6689c085ae165831e93',
    dappInfo: testDappInfo,
    params: [testParams],
  },
  network: testNetwork,
  approvalController: mockApprovalController,
  proxyApiUrl: PROXY_API_URL,
});

describe('bitcoinSendTransaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (parseRequestParams as jest.Mock).mockReturnValue({ success: true, data: { from: 'address' } });
    (getBalances as jest.Mock).mockResolvedValue({ address: { BTC: { utxos: [] } } });
    (isBtcBalance as unknown as jest.Mock).mockReturnValue(true);
    (createTransferTx as jest.Mock).mockReturnValue({ inputs: [], outputs: [], fee: 1 });
  });

  it('should return an error for invalid params', async () => {
    (parseRequestParams as jest.Mock).mockReturnValue({ success: false, error: 'Invalid params' });

    const result = await bitcoinSendTransaction(testRequestParams());

    expect(result).toEqual({
      error: rpcErrors.invalidParams({ message: 'Transaction params are invalid', data: { cause: 'Invalid params' } }),
    });
  });

  it('should return an error if balance is not available', async () => {
    (getBalances as jest.Mock).mockResolvedValue({});
    (isBtcBalance as unknown as jest.Mock).mockReturnValue(false);

    const result = await bitcoinSendTransaction(testRequestParams());

    expect(result).toEqual({ error: rpcErrors.internal('Balance for the source account is not available') });
  });

  it('should return an error if transaction cannot be created', async () => {
    const mockProvider = new BitcoinProvider();
    (getProvider as jest.Mock).mockReturnValue(mockProvider);
    (mockProvider.getNetwork as jest.Mock).mockResolvedValue(undefined);
    (createTransferTx as jest.Mock).mockReturnValue({ inputs: null, outputs: null });

    const result = await bitcoinSendTransaction(testRequestParams());

    expect(result).toEqual({ error: rpcErrors.internal('Unable to create transaction') });
  });

  it('should return an error when approval fails', async () => {
    mockRequestApproval.mockResolvedValue({
      error: rpcErrors.internal('something went wrong'),
    });

    const result = await bitcoinSendTransaction(testRequestParams());

    expect(result).toEqual({ error: rpcErrors.internal('something went wrong') });
  });

  it('should return an error when failed to retrieve transaction hash', async () => {
    const testError = new Error('test error');
    (mockApprovalController.requestApproval as jest.Mock).mockResolvedValue({ signedData: 'somesigneddata' });
    const mockProvider = new BitcoinProvider();
    (getProvider as jest.Mock).mockReturnValue(mockProvider);
    (mockProvider.issueRawTx as jest.Mock).mockImplementation(() => {
      throw testError;
    });

    const result = await bitcoinSendTransaction(testRequestParams());

    expect(result).toEqual({
      error: rpcErrors.internal({ message: 'Unable to get transaction hash', data: { cause: testError } }),
    });
  });

  it('should broadcast transaction and return transaction hash', async () => {
    (mockApprovalController.requestApproval as jest.Mock).mockResolvedValue({ signedData: 'somesigneddata' });
    const mockProvider = new BitcoinProvider();
    (getProvider as jest.Mock).mockReturnValue(mockProvider);
    (mockProvider.issueRawTx as jest.Mock).mockResolvedValue('0x123');

    const result = await bitcoinSendTransaction(testRequestParams());

    expect(result).toEqual({ result: '0x123' });
  });

  it('should return transaction hash right away when transaction is already broadcasted', async () => {
    (mockApprovalController.requestApproval as jest.Mock).mockResolvedValue({ txHash: '0x123' });

    const result = await bitcoinSendTransaction(testRequestParams());

    expect(result).toEqual({ result: '0x123' });
  });

  it('should wait for transaction receipt and handle confirmation', async () => {
    const mockProvider = new BitcoinProvider();
    (getProvider as jest.Mock).mockReturnValue(mockProvider);
    (mockProvider.waitForTx as jest.Mock).mockResolvedValue(undefined);

    (mockApprovalController.requestApproval as jest.Mock).mockResolvedValue({ txHash: '0x123' });

    const result = await bitcoinSendTransaction(testRequestParams());

    expect(result).toEqual({ result: '0x123' });
    expect(mockApprovalController.onTransactionConfirmed).toHaveBeenCalledWith('0x123');
  });

  it('should wait for transaction receipt and handle reversion', async () => {
    const mockProvider = new BitcoinProvider();
    (getProvider as jest.Mock).mockReturnValue(mockProvider);
    (mockProvider.waitForTx as jest.Mock).mockImplementation(() => {
      throw new Error('test error');
    });

    (mockApprovalController.requestApproval as jest.Mock).mockResolvedValue({ txHash: '0x123' });

    const result = await bitcoinSendTransaction(testRequestParams());

    expect(result).toEqual({ result: '0x123' });
    expect(mockApprovalController.onTransactionReverted).toHaveBeenCalledWith('0x123');
  });
});
