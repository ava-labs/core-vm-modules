import type { BitcoinProvider } from '@avalabs/core-wallets-sdk';

import { getProvider } from '../../utils/get-provider';
import { getNetworkFee } from './get-network-fee';

jest.mock('../../utils/get-provider');

const proxyApiUrl = 'https://proxy.api/';

describe('get-network-fee', () => {
  const provider = { getFeeRates: jest.fn() } as unknown as BitcoinProvider;

  beforeEach(() => {
    jest.mocked(provider.getFeeRates).mockResolvedValue({
      low: 1,
      medium: 2,
      high: 4,
    });

    jest.mocked(getProvider).mockReturnValue(provider);
  });

  it('should build the provider and use it', async () => {
    await getNetworkFee({
      isTestnet: true,
      proxyApiUrl,
    });

    expect(getProvider).toHaveBeenCalledWith({ isTestnet: true, proxyApiUrl });

    await getNetworkFee({
      isTestnet: false,
      proxyApiUrl: 'https://proxy-dev.api/',
    });

    expect(getProvider).toHaveBeenCalledWith({ isTestnet: false, proxyApiUrl: 'https://proxy-dev.api/' });
  });

  it('should call getFeeRates() method', async () => {
    await getNetworkFee({
      isTestnet: false,
      proxyApiUrl,
    });

    expect(provider.getFeeRates).toHaveBeenCalled();
  });

  it('maps returned fee rates to known model', async () => {
    expect(
      await getNetworkFee({
        isTestnet: false,
        proxyApiUrl,
      }),
    ).toEqual({
      low: {
        maxFeePerGas: 1n,
      },
      medium: {
        maxFeePerGas: 2n,
      },
      high: {
        maxFeePerGas: 4n,
      },
      isFixedFee: false,
    });
  });
});
