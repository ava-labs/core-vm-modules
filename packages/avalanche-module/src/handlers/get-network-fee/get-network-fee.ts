import { NetworkVMType, type NetworkFees } from '@avalabs/vm-module-types';
import { getProvider } from '../../utils/get-provider';

/**
 * Returns {@link NetworkFees} based on a fixed fee.
 */
export async function getNetworkFee({
  isTestnet,
  vmName,
}: {
  isTestnet: boolean;
  vmName: NetworkVMType;
}): Promise<NetworkFees> {
  const provider = await getProvider({ isTestnet, vmName });

  // Return static fees for X-Chain and pre-Etna P-Chain
  if (vmName === NetworkVMType.AVM || !provider.isEtnaEnabled()) {
    // this is 0.001 Avax denominated in nAvax, taken from https://docs.avax.network/reference/standards/guides/txn-fees#fee-schedule
    return {
      baseFee: BigInt(1000000),
      low: {
        maxFeePerGas: BigInt(1000000),
      },
      medium: {
        maxFeePerGas: BigInt(1000000),
      },
      high: {
        maxFeePerGas: BigInt(1000000),
      },
      isFixedFee: true,
    };
  }

  const { price } = await provider.getApiP().getFeeState();

  // This represents how much (percentage-wise) you need to bump the base fee
  // to get to the next integer (since we operate with BigInts here)
  const minimumPercentageBump = 100 / Number(price) / 100;

  // Added percentages for faster presets
  const fastPCentage = Math.min(1, Math.max(minimumPercentageBump, 0.15));
  const instPCentage = Math.min(1, Math.max(minimumPercentageBump * 2, 0.3));

  const fastMultiplier = 1 + fastPCentage; // Adds between 15 and 100%
  const instantMultiplier = 1 + instPCentage; // Adds between 30 and 100%

  // Even though the hard-coded percentages would end up being integers after
  // multiplying by 100x, we still need to round due to floating point precision errors.
  return {
    baseFee: price,
    low: {
      maxFeePerGas: price,
    },
    medium: {
      maxFeePerGas: (price * BigInt(Math.round(100 * fastMultiplier))) / 100n,
    },
    high: {
      maxFeePerGas: (price * BigInt(Math.round(100 * instantMultiplier))) / 100n,
    },
    isFixedFee: false,
  };
}
