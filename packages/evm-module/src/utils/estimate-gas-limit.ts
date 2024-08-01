import { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';
import type { BigNumberish } from 'ethers';

export const estimateGasLimit = async ({
  transactionParams: { from, to, data, value },
  provider,
}: {
  transactionParams: {
    from: string;
    to: string;
    data?: string;
    value?: BigNumberish;
  };
  provider: JsonRpcBatchInternal;
}): Promise<number> => {
  const nonce = await provider.getTransactionCount(from);

  return Number(
    await provider.estimateGas({
      from,
      to,
      nonce,
      data,
      value,
    }),
  );
};
