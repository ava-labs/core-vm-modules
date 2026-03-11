import { NetworkVMType, type Network } from '@avalabs/vm-module-types';
import { RetryBackoffPolicy } from '@internal/utils';
import type { HyperSDKClient } from 'hypersdk-client';
import { getProvider } from '../utils/get-provider';
import { hvmGetBalances } from './get-balances';

jest.mock('../utils/get-provider');

const mockNetwork: Network = {
  chainId: 1,
  chainName: 'example',
  rpcUrl: 'https://rpc.example',
  vmName: NetworkVMType.HVM,
  vmRpcPrefix: 'hvm',
  networkToken: {
    name: 'COIN',
    symbol: 'COIN',
    decimals: 9,
  },
};

const providerMock = {
  getBalance: jest.fn(),
} as unknown as HyperSDKClient;

describe('packages/hvm-module/src/handlers/get-balances', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(RetryBackoffPolicy, 'exponential').mockReturnValue((_) => 0);
  });

  it('returns balances for all addresses', async () => {
    jest.mocked(getProvider).mockReturnValue(providerMock);
    jest.mocked(providerMock.getBalance).mockImplementation(async (address: string) => {
      switch (address) {
        case 'address1':
          return 1n;
        case 'address2':
          throw new Error('failed to fetch balances');
        case 'address3':
          return 3n;
        default:
          return 5n;
      }
    });

    await expect(
      hvmGetBalances({
        addresses: ['address1', 'address2', 'address3', 'address4'],
        network: mockNetwork,
        currency: 'usd',
      }),
    ).resolves.toEqual({
      address1: {
        COIN: {
          balance: 1n,
          balanceDisplayValue: '0.000000001',
          coingeckoId: '',
          decimals: 9,
          name: 'COIN',
          symbol: 'COIN',
          type: 'NATIVE',
        },
      },
      address2: {
        error: 'Error: Max retry exceeded. Error: failed to fetch balances',
      },
      address3: {
        COIN: {
          balance: 3n,
          balanceDisplayValue: '0.000000003',
          coingeckoId: '',
          decimals: 9,
          name: 'COIN',
          symbol: 'COIN',
          type: 'NATIVE',
        },
      },
      address4: {
        COIN: {
          balance: 5n,
          balanceDisplayValue: '0.000000005',
          coingeckoId: '',
          decimals: 9,
          name: 'COIN',
          symbol: 'COIN',
          type: 'NATIVE',
        },
      },
    });
  }, 12_000);

  it('retries getBalance errors and returns successful balance', async () => {
    jest.mocked(getProvider).mockReturnValue(providerMock);
    jest.mocked(providerMock.getBalance).mockRejectedValueOnce(new Error('network timeout')).mockResolvedValueOnce(11n);

    await expect(
      hvmGetBalances({
        addresses: ['address1'],
        network: mockNetwork,
        currency: 'usd',
      }),
    ).resolves.toEqual({
      address1: {
        COIN: {
          balance: 11n,
          balanceDisplayValue: '0.00000001',
          coingeckoId: '',
          decimals: 9,
          name: 'COIN',
          symbol: 'COIN',
          type: 'NATIVE',
        },
      },
    });

    expect(providerMock.getBalance).toHaveBeenCalledTimes(2);
  });
});
