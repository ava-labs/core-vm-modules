export type NetworkFees = {
  low: { maxFeePerGas: bigint; maxPriorityFeePerGas?: bigint };
  medium: { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint };
  high: { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint };
  baseFee: bigint;
  isFixedFee: boolean;
};
