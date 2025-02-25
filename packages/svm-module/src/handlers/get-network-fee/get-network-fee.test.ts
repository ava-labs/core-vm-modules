import type { Network } from '@avalabs/vm-module-types';

import { getProvider } from '@src/utils/get-provider';
import { SOL_DECIMALS, SOLANA_MAINNET_CAIP2_ID } from '@src/constants';

import { DEFAULT_PRIORITY_FEE, getNetworkFee } from './get-network-fee';

jest.mock('@src/utils/get-provider');

describe('src/handlers/get-network-fee', () => {
  const network = { caipId: SOLANA_MAINNET_CAIP2_ID } as unknown as Network;
  const proxyApiUrl = 'http://example.com';
  const mockProvider = {
    getRecentPrioritizationFees: jest.fn().mockReturnValue({
      send: jest.fn(),
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getProvider as jest.Mock).mockReturnValue(mockProvider);
  });

  it('should return default fees if RPC call returns empty array', async () => {
    mockProvider.getRecentPrioritizationFees().send.mockResolvedValue([]);

    const result = await getNetworkFee(network, proxyApiUrl);

    expect(result).toEqual({
      high: {
        maxFeePerGas: BigInt(DEFAULT_PRIORITY_FEE.high),
        maxPriorityFeePerGas: BigInt(DEFAULT_PRIORITY_FEE.high),
      },
      medium: {
        maxFeePerGas: BigInt(DEFAULT_PRIORITY_FEE.medium),
        maxPriorityFeePerGas: BigInt(DEFAULT_PRIORITY_FEE.medium),
      },
      low: {
        maxFeePerGas: BigInt(DEFAULT_PRIORITY_FEE.low),
        maxPriorityFeePerGas: BigInt(DEFAULT_PRIORITY_FEE.low),
      },
      baseFee: BigInt(DEFAULT_PRIORITY_FEE.low),
      displayDecimals: SOL_DECIMALS,
      isFixedFee: false,
    });
  });

  it('should calculate fees based on RPC call response', async () => {
    const feesRaw = [{ prioritizationFee: 1000000n }, { prioritizationFee: 2000000n }, { prioritizationFee: 3000000n }];
    mockProvider.getRecentPrioritizationFees().send.mockResolvedValue(feesRaw);

    const result = await getNetworkFee(network, proxyApiUrl);

    expect(result).toEqual({
      high: {
        maxFeePerGas: 3150000n,
        maxPriorityFeePerGas: 3150000n,
      },
      medium: {
        maxFeePerGas: 2100000n,
        maxPriorityFeePerGas: 2100000n,
      },
      low: {
        maxFeePerGas: 1050000n,
        maxPriorityFeePerGas: 1050000n,
      },
      baseFee: 1050000n,
      displayDecimals: SOL_DECIMALS,
      isFixedFee: false,
    });
  });
});
