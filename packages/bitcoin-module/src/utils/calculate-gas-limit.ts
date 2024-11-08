// The transaction's byte size is for BTC as gasLimit is for EVM.
// Bitcoin's formula for fee is `transactionByteLength * feeRate`.
// Since we know the `fee` and the `feeRate`, we can get the transaction's
// byte length by division.
//
// Note: We use `Math.ceil` here to ensure the gasLimit is sufficient and
// to avoid any decimal values. Rounding up helps prevent underestimating the
// required gas, as gasLimit must be an integer. While this may slightly increase
// the fee, it minimizes the risk of transaction failure due to insufficient gasLimit.

export const calculateGasLimit = (fee: number, feeRate: number): number => {
  return Math.ceil(fee / feeRate);
};
