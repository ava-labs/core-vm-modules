export type NetworkFees = {
  low: { maxFeePerGas: bigint; maxPriorityFeePerGas?: bigint; maxTip?: bigint };
  medium: { maxFeePerGas: bigint; maxPriorityFeePerGas?: bigint; maxTip?: bigint };
  high: { maxFeePerGas: bigint; maxPriorityFeePerGas?: bigint; maxTip?: bigint };
  baseFee?: bigint;
  isFixedFee: boolean;
  displayDecimals: number;
};
