// The transaction's byte size is for BTC as gasLimit is for EVM.
// Bitcoin's formula for fee is `transactionByteLength * feeRate`.
// Since we know the `fee` and the `feeRate`, we can get the transaction's
// byte length by division.
export const calculateGasLimit = (fee: number, feeRate: number): number => {
  return fee / feeRate;
};
