import { bitcoinSendTransaction } from './bitcoin-send-transaction';
import { parseRequestParams } from './schema';
import { getProvider } from '../../utils/get-provider';
import { getBalances } from '../get-balances/get-balances';
import { isBtcBalance } from '../../utils/is-btc-balance';
import { createTransferTx, BitcoinProvider } from '@avalabs/core-wallets-sdk';
import {
  NetworkVMType,
  RpcMethod,
  TokenType,
  type ApprovalController,
  type Network,
  type TokenWithBalanceBTC,
} from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import { getTxUpdater } from '../../utils/bitcoin-tx-updater';
import type { TokenService } from '@internal/utils';

jest.mock('./schema');
jest.mock('../../utils/get-provider');
jest.mock('../get-balances/get-balances');
jest.mock('../../utils/is-btc-balance');
jest.mock('../../utils/bitcoin-tx-updater', () => ({
  getTxUpdater: jest.fn().mockReturnValue({
    updateTx: jest.fn(),
    cleanup: jest.fn(),
  }),
}));
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
const mockOnTransactionPending = jest.fn();
const mockRequestApproval = jest.fn();
const mockApprovalController: jest.Mocked<ApprovalController> = {
  requestApproval: mockRequestApproval,
  requestPublicKey: jest.fn(),
  onTransactionPending: mockOnTransactionPending,
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
  explorerUrl: 'https://explorer.com',
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

const testBtcBalance: TokenWithBalanceBTC = {
  logoUri: 'https://example.com/path/to/bitcoin-logo.png',
  utxos: [
    {
      txHash: 'e4c1b8f3a7d8c2e5a9b4d6f7e3a1c8b2e9f7d1a4c8d6f3b1e5a7b9c2d8a3f1b2',
      txHex: '0100000001b7c3e5d8a1f9c3b7e1a8d6c9e3f4b1a8e9d7c3f8a1b7e9c3a5d8f3e9b7d2a1',
      index: 0,
      value: 0.0075,
      script: '76a914b1d8f9e3a7b2d8f9e3a1b7c8f9e3d8a1c3f8e9a7ac',
      blockHeight: 812763,
      confirmations: 325,
      confirmedTime: '2024-06-01T10:12:34Z',
    },
  ],
  utxosUnconfirmed: [
    {
      txHash: 'c3a9b1f7d8e3c2a1b8e9f3d7c4e1b9a7f8e1d9c7b4f1e3a7d8f9b2c1e3f7a1c8',
      index: 2,
      value: 0.002,
      script: '76a914a3d8b1c7f9e3a9b7d8f3c2a1d9e1f8a7c3d4f1b8ac',
      blockHeight: 0, // Not yet confirmed
      confirmations: 0,
      confirmedTime: undefined,
    },
  ],
  unconfirmedBalance: 200000n,
  unconfirmedBalanceDisplayValue: '0.002 BTC',
  unconfirmedBalanceCurrencyDisplayValue: '$56.00',
  unconfirmedBalanceInCurrency: 56,

  // Inherited properties from NetworkTokenWithBalance
  name: 'Bitcoin',
  symbol: 'BTC',
  decimals: 8,
  coingeckoId: 'bitcoin',
  type: TokenType.NATIVE,

  // Market data
  priceInCurrency: 28000,
  priceChanges: {
    percentage: -1.2,
    value: -340,
  },
  marketCap: 500000000000,
  change24: -1.2,
  vol24: 35000000000,

  // Balance details
  balance: 750000n,
  balanceDisplayValue: '0.0075 BTC',
  balanceInCurrency: 210,
  balanceCurrencyDisplayValue: '$210.00',
};

const PROXY_API_URL = 'https://proxy-api.avax.network';

const testParams = { from: 'from', to: 'to', amount: 1, feeRate: 1 };

const mockTokenService = {
  getSimplePrice: jest.fn(),
  getPricesByAddresses: jest.fn(),
} as unknown as jest.Mocked<TokenService>;

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
  tokenService: mockTokenService,
});

const testInputs = [
  {
    txHash: 'f1a6c8e9213d5b8a7d3ab9084b6d2e9487f2e7681c5ab84f56c3e0c4f20d1a5b',
    txHex: '02000000000101e40f5678c44e9e0012a20b2ff7f88802b1a27b3b492198a1f6bb482f5bc22a60',
    index: 3,
    value: 0.005,
    script: '76a9141a6b2b63c9e88eb8fd24d6c982a5a7afecba5ec488ac',
    blockHeight: 796543,
    confirmations: 253,
    confirmedTime: '2023-08-21T15:32:10Z',
  },
];

const testOutputs = [
  {
    txHash: 'c9f7d8e5a3bc6d07a9e2f1b384d3c9a21b7d69e5c8b7f1a5d9a2b6e7c9f1d4a8',
    txHex: '0100000001b1a5d9a2e7c9f1d48e5c3b9a7d2f1b7a3bc6d8e5a3c9d7f1a5d9a2e7c9f7d8e5',
    index: 1,
    value: 0.0023,
    script: '76a914b6c1b8e21d8a5e8f9d1c2b8e9f2a5d8e3c4b9a8e9ac',
    blockHeight: 812345,
    confirmations: 128,
    confirmedTime: '2024-05-14T08:45:33Z',
  },
];

describe('bitcoinSendTransaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (parseRequestParams as jest.Mock).mockReturnValue({ success: true, data: testParams });
    (getBalances as jest.Mock).mockResolvedValue({ from: { BTC: testBtcBalance } });
    (isBtcBalance as unknown as jest.Mock).mockReturnValue(true);
    (createTransferTx as jest.Mock).mockReturnValue({ inputs: testInputs, outputs: testOutputs, fee: 1 });
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

  it('should broadcast transaction, provide fee updater and  return transaction hash', async () => {
    const updateTx = jest.fn();
    jest.mocked(getTxUpdater).mockReturnValueOnce({ cleanup: jest.fn(), updateTx });
    (mockApprovalController.requestApproval as jest.Mock).mockResolvedValue({ signedData: 'somesigneddata' });
    const mockProvider = new BitcoinProvider();
    (getProvider as jest.Mock).mockReturnValue(mockProvider);
    (mockProvider.issueRawTx as jest.Mock).mockResolvedValue('0x123');

    const params = testRequestParams();
    const result = await bitcoinSendTransaction(params);

    expect(mockApprovalController.requestApproval).toHaveBeenCalledWith({
      request: params.request,
      displayData: {
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
                value: testDappInfo,
                type: 'link',
              },
              {
                label: 'From',
                value: 'from',
                type: 'address',
              },
              {
                label: 'To',
                value: 'to',
                type: 'address',
              },
              {
                label: 'Amount',
                maxDecimals: 8,
                symbol: 'BTC',
                type: 'currency',
                value: 1n,
              },
            ],
          },
        ],
        networkFeeSelector: true,
      },
      signingData: {
        type: RpcMethod.BITCOIN_SEND_TRANSACTION,
        account: 'from',
        data: {
          to: 'to',
          amount: 1,
          fee: 1,
          feeRate: 1,
          gasLimit: 1,
          inputs: testInputs,
          outputs: testOutputs,
          balance: testBtcBalance,
        },
      },
      updateTx,
    });

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
    expect(mockApprovalController.onTransactionConfirmed).toHaveBeenCalledWith({
      txHash: '0x123',
      explorerLink: 'https://explorer.com/tx/0x123',
      request: testRequestParams().request,
    });
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
    expect(mockApprovalController.onTransactionReverted).toHaveBeenCalledWith({
      request: testRequestParams().request,
      txHash: '0x123',
    });
  });
});
