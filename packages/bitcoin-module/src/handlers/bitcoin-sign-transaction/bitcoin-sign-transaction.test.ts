import { bitcoinSignTransaction } from './bitcoin-sign-transaction';
import { type BitcoinSignTransactionParams } from './schema';
import { NetworkVMType, RpcMethod, type ApprovalController, type Network } from '@avalabs/vm-module-types';
import { BitcoinProvider } from '@avalabs/core-wallets-sdk';
import { rpcErrors } from '@metamask/rpc-errors';
import { getProvider } from '../../utils/get-provider';

jest.mock('../../utils/get-provider');
jest.mock('@avalabs/core-wallets-sdk', () => ({
  BitcoinProvider: jest.fn().mockImplementation(() => ({
    getAddressFromScript: jest.fn(),
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
  requestPublicKey: jest.fn(),
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

const TEST_INPUTS = [
  {
    txHash: 'fec5120f24bb57ad43c486053ad44d474e5fac545919db6558a5a827e62bbeb0',
    index: 1,
    value: 1_000_000,
    script: '00148a8750a949264dc33f6f40cff49c45ccd7b170f0',
    blockHeight: 3009678,
    confirmations: 93133,
  },
  {
    txHash: 'b1616c0b72e89d7f50213140741fc562de3eadcde6c02f469665c98b8291f393',
    index: 1,
    value: 1_500_000,
    script: '00148a8750a949264dc33f6f40cff49c45ccd7b170f0',
    blockHeight: 3009677,
    confirmations: 93134,
  },
] as const;

const TEST_OUTPUTS = [
  {
    address: 'recipient-address',
    value: 1_500_000,
  },
  {
    address: 'sender-address',
    value: 900_000,
  },
];

const testParams = { inputs: TEST_INPUTS, outputs: TEST_OUTPUTS };

const testRequestParams = (params?: BitcoinSignTransactionParams) => ({
  request: {
    requestId: '1',
    sessionId: '2',
    method: RpcMethod.BITCOIN_SEND_TRANSACTION,
    chainId: 'bip122:000000000019d6689c085ae165831e93',
    dappInfo: testDappInfo,
    params: params ?? testParams,
  },
  network: testNetwork,
  approvalController: mockApprovalController,
  proxyApiUrl: PROXY_API_URL,
});

describe('bitcoin-sign-transaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return an error for invalid params', async () => {
    const result = await bitcoinSignTransaction(
      testRequestParams({ inputs: [{ ...TEST_INPUTS[0], script: '' }], outputs: TEST_OUTPUTS }),
    );

    expect(result).toEqual({
      error: rpcErrors.invalidParams({ message: 'Transaction params are invalid', data: { cause: 'Invalid params' } }),
    });
  });

  it('should return an error if more than one input UTXO script is found', async () => {
    const mockProvider = new BitcoinProvider();
    (getProvider as jest.Mock).mockReturnValue(mockProvider);

    const params = testRequestParams({
      inputs: [TEST_INPUTS[0], { ...TEST_INPUTS[1], script: 'some-other-script' }],
      outputs: TEST_OUTPUTS,
    });

    const result = await bitcoinSignTransaction(params);

    expect(result).toEqual({
      error: rpcErrors.invalidParams({
        message: 'Transaction invalid or cannot be parsed',
        data: {
          cause: new Error('All input UTXOs must belong to a single address, found 2'),
        },
      }),
    });
  });

  it('should return an error if input address cannot be resolved', async () => {
    const mockProvider = new BitcoinProvider();
    (getProvider as jest.Mock).mockReturnValue(mockProvider);
    (mockProvider.getAddressFromScript as jest.Mock).mockRejectedValueOnce(
      new Error(`Unable to resolve address for script`),
    );

    const { error } = await bitcoinSignTransaction(testRequestParams());

    expect(error).toEqual(rpcErrors.invalidParams({ message: 'Transaction invalid or cannot be parsed' }));
    expect(error?.cause).toEqual(new Error('Unable to resolve address for script'));
  });

  it('should return an error when approval fails', async () => {
    mockRequestApproval.mockResolvedValue({
      error: rpcErrors.internal('something went wrong'),
    });

    const result = await bitcoinSignTransaction(testRequestParams());

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

    const result = await bitcoinSignTransaction(testRequestParams());

    expect(result).toEqual({
      error: rpcErrors.internal({ message: 'Unable to get transaction hash', data: { cause: testError } }),
    });
  });

  it('should broadcast transaction and return transaction hash', async () => {
    (mockApprovalController.requestApproval as jest.Mock).mockResolvedValue({ signedData: 'somesigneddata' });
    const mockProvider = new BitcoinProvider();
    (getProvider as jest.Mock).mockReturnValue(mockProvider);
    (mockProvider.getAddressFromScript as jest.Mock).mockResolvedValue('sender-address');
    (mockProvider.issueRawTx as jest.Mock).mockResolvedValue('0x123');

    const params = testRequestParams();
    const result = await bitcoinSignTransaction(params);

    expect(mockApprovalController.requestApproval).toHaveBeenCalledWith({
      request: params.request,
      displayData: {
        title: 'Approve Transaction',
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
                value: 'sender-address',
                type: 'address',
              },
              {
                label: 'Total Transferred Amount',
                maxDecimals: 8,
                symbol: 'BTC',
                type: 'currency',
                value: 1_500_000n,
              },
            ],
          },
          {
            title: 'Recipients',
            items: [
              {
                label: 'recipient-address',
                maxDecimals: 8,
                symbol: 'BTC',
                amount: 1_500_000n,
                type: 'fundsRecipient',
              },
            ],
          },
          {
            title: 'Network Fee',
            items: [
              {
                label: 'Total Fee',
                maxDecimals: 8,
                symbol: 'BTC',
                type: 'currency',
                value: 100_000n, // <sum of inputs> MINUS <sum of outputs>
              },
            ],
          },
        ],
        networkFeeSelector: false,
      },
      signingData: {
        type: RpcMethod.BITCOIN_SIGN_TRANSACTION,
        account: 'sender-address',
        data: {
          inputs: TEST_INPUTS,
          outputs: TEST_OUTPUTS,
        },
      },
    });

    expect(result).toEqual({ result: '0x123' });
  });
});
