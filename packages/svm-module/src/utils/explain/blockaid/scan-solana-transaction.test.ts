import { scanSolanaTransaction } from './scan-solana-transaction';
import { base58, base64 } from '@scure/base';
import { getBlockaid } from '../../../utils/blockaid';

jest.mock('@scure/base', () => ({
  base58: {
    decode: jest.fn(),
  },
  base64: {
    encode: jest.fn(),
  },
}));

const mockBlockaidInstance = {
  solana: {
    message: {
      scan: jest.fn(),
    },
  },
};
jest.mock('../../../utils/blockaid', () => ({
  getBlockaid: jest.fn(() => mockBlockaidInstance),
}));

describe('scanSolanaTransaction', () => {
  const proxyApiUrl = 'https://example.com';
  const params = {
    account: 'mockAccount',
    chain: 'mainnet-beta',
    transactionBase64: 'mockTransactionBase64',
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const dAppUrl = 'https://dapp.example.com';

  beforeEach(() => {
    jest.mocked(base58.decode).mockReturnValue(Buffer.from('decodedAccount'));
    jest.mocked(base64.encode).mockReturnValue('encodedAccount');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call Blockaid.solana.message.scan with correct parameters', async () => {
    mockBlockaidInstance.solana.message.scan.mockResolvedValueOnce({ result: 'mockResult' });

    const result = await scanSolanaTransaction({ proxyApiUrl, params, dAppUrl });

    expect(getBlockaid).toHaveBeenCalledWith(proxyApiUrl);
    expect(base58.decode).toHaveBeenCalledWith(params.account);
    expect(base64.encode).toHaveBeenCalledWith(Buffer.from('decodedAccount'));
    expect(mockBlockaidInstance.solana.message.scan).toHaveBeenCalledWith({
      chain: params.chain,
      options: ['simulation', 'validation'],
      encoding: 'base64',
      metadata: {
        url: dAppUrl,
      },
      transactions: [params.transactionBase64],
      account_address: 'encodedAccount',
    });
    expect(result).toEqual({ result: 'mockResult' });
  });

  it('should return null and log an error if Blockaid.solana.message.scan throws an error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockBlockaidInstance.solana.message.scan.mockRejectedValueOnce(new Error('Mock error'));

    const result = await scanSolanaTransaction({ proxyApiUrl, params, dAppUrl });

    expect(consoleErrorSpy).toHaveBeenCalledWith('solana.message.scan() error', expect.any(Error));
    expect(result).toBeNull();

    consoleErrorSpy.mockRestore();
  });
});
