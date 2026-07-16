import { z } from 'zod';

export const hyperEvmNormalTransactionSchema = z.object({
  blockNumber: z.string(),
  timeStamp: z.string(),
  hash: z.string(),
  nonce: z.string(),
  blockHash: z.string(),
  transactionIndex: z.string(),
  from: z.string(),
  to: z.string(),
  value: z.string(),
  gas: z.string(),
  gasPrice: z.string(),
  isError: z.string(),
  txreceipt_status: z.string(),
  input: z.string(),
  contractAddress: z.string(),
  cumulativeGasUsed: z.string(),
  gasUsed: z.string(),
  confirmations: z.string(),
});

export const hyperEvmErc20TransferSchema = z.object({
  blockNumber: z.string(),
  timeStamp: z.string(),
  hash: z.string(),
  nonce: z.string(),
  blockHash: z.string(),
  from: z.string(),
  contractAddress: z.string(),
  to: z.string(),
  value: z.string(),
  tokenName: z.string(),
  tokenSymbol: z.string(),
  tokenDecimal: z.string(),
  transactionIndex: z.string(),
  gas: z.string(),
  gasPrice: z.string(),
  gasUsed: z.string(),
  cumulativeGasUsed: z.string(),
  input: z.string(),
  confirmations: z.string(),
});

export const hyperEvmInternalTransactionSchema = z.object({
  blockNumber: z.string(),
  timeStamp: z.string(),
  hash: z.string(),
  from: z.string(),
  to: z.string(),
  value: z.string(),
  contractAddress: z.string(),
  input: z.string(),
  type: z.string(),
  gas: z.string(),
  gasUsed: z.string(),
  traceId: z.string(),
  isError: z.string(),
  errCode: z.string(),
});

export type HyperEvmNormalTransaction = z.infer<typeof hyperEvmNormalTransactionSchema>;
export type HyperEvmErc20Transfer = z.infer<typeof hyperEvmErc20TransferSchema>;
export type HyperEvmInternalTransaction = z.infer<typeof hyperEvmInternalTransactionSchema>;
