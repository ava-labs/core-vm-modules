import type { NetworkFees } from '@avalabs/vm-module-types';

import { getProvider } from '../../utils/get-provider';

/**
 * Returns {@link NetworkFees} based on `estimatesmartfee` RPC call
 */
export async function getNetworkFee({
  isTestnet,
  proxyApiUrl,
}: {
  isTestnet: boolean;
  proxyApiUrl: string;
}): Promise<NetworkFees> {
  const provider = await getProvider({
    isTestnet,
    proxyApiUrl,
  });

  const { high, low, medium } = await provider.getFeeRates();

  return {
    low: {
      maxFeePerGas: BigInt(low),
    },
    medium: {
      maxFeePerGas: BigInt(medium),
    },
    high: {
      maxFeePerGas: BigInt(high),
    },
    isFixedFee: false,
  };
}
