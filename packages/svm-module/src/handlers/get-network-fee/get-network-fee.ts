import { type NetworkFeeParam, type NetworkFees } from '@avalabs/vm-module-types';

import { getProvider } from '@src/utils/get-provider';
import { SOL_DECIMALS } from '@src/constants';

const LamportsMultiplier = 1e6;
export const DEFAULT_PRIORITY_FEE = {
  high: 150 * LamportsMultiplier,
  medium: 75 * LamportsMultiplier,
  low: 2 * LamportsMultiplier,
} as const;

type ValidRecentFees = [number, number, ...number[]];

const ensureEnoughData = (fees: number[]): ValidRecentFees => {
  const normalizedFees =
    fees.length === 0
      ? [DEFAULT_PRIORITY_FEE.low, DEFAULT_PRIORITY_FEE.low]
      : fees.length === 1
      ? [fees[0]!, DEFAULT_PRIORITY_FEE.low]
      : fees;

  return normalizedFees.slice().sort((a, b) => a - b) as ValidRecentFees;
};

/**
 * The RPC call (getRecentPrioritizationFees) returns the *lowest* priority fees (per compute unit)
 * that resulted in at least one transaction being succesfully included in the block.
 *
 * This means the request usually returns all zeroes - I've only once seen a different value,
 * for a single block out of 150 returned, and it was a 1000 MicroLamports.
 *
 * However, Phantom (the most popular Solana wallet) seems to always add at least a little bit
 * of priority fee.
 *
 * The lowest I've seen in my testing was 0.19 Lamport per compute unit, but this was an outlier.
 * I'm usually paying below 10 Lamports/cu, and sometimes as high as 150 or 300/cu -- all while
 * the RPC call returns zeroes, so it's not super reliable for determining the actual fees being paid :)
 *
 * The implementation here is by no means perfect. The way it I expect it to work is the following:
 *  - with low/regular network traffic, users will be suggested to pay the default fees hardcoded below
 *    (if we decide to show them at all -- Phantom does not show a widget at all)
 *  - only when network congestion is super high, the RPC call will return non-zero values, and only then
 *    we will suggest paying higher priority fees.
 */
export async function getNetworkFee(network: NetworkFeeParam, proxyApiUrl: string): Promise<NetworkFees> {
  const provider = getProvider({ isTestnet: Boolean(network.isTestnet), proxyApiUrl });

  const getFees = await provider.getRecentPrioritizationFees();
  const feesRaw = await getFees.send();

  const useDefaultFees = feesRaw.length === 0 || feesRaw.every((block) => block.prioritizationFee === 0n);

  if (useDefaultFees) {
    return {
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
    };
  }

  const sortedFees = ensureEnoughData(feesRaw.map((block) => Number(block.prioritizationFee)));
  // We know the array is not empty and sorted, so we can safely access the first and last elements
  const minFeeInRecentBlocks = sortedFees.at(0)!;
  const maxFeeInRecentBlocks = sortedFees.at(-1)!;
  const midIndex = Math.floor(sortedFees.length / 2);
  const medianFee =
    sortedFees.length % 2 === 1
      ? (sortedFees[midIndex] as number)
      : (sortedFees[midIndex - 1]! + sortedFees[midIndex]!) / 2; // Even length: return average of middle elements

  // Prevent the fees from going below the default values
  // If the RPC call returned non-zero values, the network congestion is likely to be very high, so we add 5%.
  // We also prevent returning fees lower than the default, hardcoded values, as the RPC call is not very reliable.
  const presetHigh = BigInt(Math.ceil(maxFeeInRecentBlocks * 1.05));
  const presetMedium = BigInt(Math.ceil(medianFee * 1.05));
  const presetLow = BigInt(Math.ceil(minFeeInRecentBlocks * 1.05));

  // TODO: The shape of response here needs a general refactoring, it's not very generic.
  return {
    high: {
      maxFeePerGas: presetHigh,
      maxPriorityFeePerGas: presetHigh,
    },
    medium: {
      maxFeePerGas: presetMedium,
      maxPriorityFeePerGas: presetMedium,
    },
    low: {
      maxFeePerGas: presetLow,
      maxPriorityFeePerGas: presetLow,
    },
    baseFee: presetLow,
    displayDecimals: SOL_DECIMALS,
    isFixedFee: false,
  };
}
