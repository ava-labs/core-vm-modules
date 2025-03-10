import type { Hex } from './common';

type SuggestedGasPriceOption = {
  maxFeePerGas: Hex;
  maxPriorityFeePerGas: Hex;
};

export type SuggestGasPriceOptionsResponse = {
  slow: SuggestedGasPriceOption;
  normal: SuggestedGasPriceOption;
  fast: SuggestedGasPriceOption;
};

export type NetworkFees = {
  low: { maxFeePerGas: bigint; maxPriorityFeePerGas?: bigint };
  medium: { maxFeePerGas: bigint; maxPriorityFeePerGas?: bigint };
  high: { maxFeePerGas: bigint; maxPriorityFeePerGas?: bigint };
  baseFee?: bigint;
  isFixedFee: boolean;
  displayDecimals?: number;
};
