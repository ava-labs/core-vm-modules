import { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';

export const getNonce = async ({
  from,
  provider,
}: {
  from: string;
  provider: JsonRpcBatchInternal;
}): Promise<number> => {
  return provider.getTransactionCount(from);
};
