import type { NetworkFees } from '@avalabs/vm-module-types';

/**
 * Returns {@link NetworkFees} based on a fixed fee.
 */
export async function getNetworkFee(): Promise<NetworkFees> {
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
