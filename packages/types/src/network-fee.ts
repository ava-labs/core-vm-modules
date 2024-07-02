export type NetworkFees = {
  low: { maxPriorityFeePerGas: bigint; maxFeePerGas: bigint };
  medium: { maxPriorityFeePerGas: bigint; maxFeePerGas: bigint };
  high: { maxPriorityFeePerGas: bigint; maxFeePerGas: bigint };
  baseFee: bigint;
};
