import type { BitcoinHistoryTx, BitcoinProvider } from '@avalabs/core-wallets-sdk';
import type { Network } from '@avalabs/vm-module-types';

import { getProvider } from '../../utils/get-provider';

import { getTransactionHistory } from './get-transaction-history';
import { convertBtcTransaction } from './convert-btc-transaction';

jest.mock('../../utils/get-provider');

const proxyApiUrl = 'https://proxy.api/';

const btcMain: Network = {
  isTestnet: false,
  chainId: 987654,
  networkToken: {
    decimals: 8,
    name: 'Bitcoin',
    symbol: 'BTC',
  },
  explorerUrl: 'https://btc.main',
} as unknown as Network;

const btcTest: Network = {
  isTestnet: true,
  chainId: 987653,
  networkToken: {
    decimals: 8,
    name: 'Bitcoin',
    symbol: 'BTC',
  },
  explorerUrl: 'https://btc.test',
} as unknown as Network;

const userAddress = 'b1-user-address';
const txAddress = 'b1-tx-address';

const rawHistory: BitcoinHistoryTx[] = [
  {
    addresses: [txAddress],
    amount: 15_000,
    fee: 600,
    block: 100_000,
    confirmations: 1,
    containsMultisig: false,
    hash: '0x1rstTxHash',
    isSender: true,
    receivedTime: 172139193,
    confirmedTime: 172139323,
  },
];

describe('get-transaction-history', () => {
  const provider = { getTxHistory: jest.fn() } as unknown as BitcoinProvider;

  beforeEach(() => {
    jest.mocked(provider.getTxHistory).mockResolvedValue(rawHistory);
    jest.mocked(getProvider).mockResolvedValue(provider);
  });

  it('should build the provider', async () => {
    await getTransactionHistory({
      address: userAddress,
      network: btcMain,
      proxyApiUrl,
    });

    expect(getProvider).toHaveBeenCalledWith({ isTestnet: false, proxyApiUrl });

    await getTransactionHistory({
      address: txAddress,
      network: btcTest,
      proxyApiUrl: 'https://proxy-dev.api/',
    });

    expect(getProvider).toHaveBeenCalledWith({ isTestnet: true, proxyApiUrl: 'https://proxy-dev.api/' });
  });

  it('calls getTxHistory() method', async () => {
    await getTransactionHistory({
      address: userAddress,
      network: btcTest,
      proxyApiUrl,
    });

    expect(provider.getTxHistory).toHaveBeenCalledWith(userAddress);
  });

  it('maps returned fee rates to known model', async () => {
    expect(
      await getTransactionHistory({
        address: userAddress,
        network: btcTest,
        proxyApiUrl,
      }),
    ).toEqual(rawHistory.map((tx) => convertBtcTransaction(tx, { address: userAddress, network: btcTest })));
  });
});
