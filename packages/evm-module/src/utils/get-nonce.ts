import { JsonRpcBatchInternal } from '@avalabs/wallets-sdk';

export const getNonce = async ({
  from,
  provider,
}: {
  from: string;
  provider: JsonRpcBatchInternal;
}): Promise<number> => {
  return provider.getTransactionCount(from);
};
