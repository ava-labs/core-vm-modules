import type { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';

import { getNonce } from '../../../utils/get-nonce';
import type { TransactionBatchParams } from '../../../types';

export const ensureProperNonces = async (transactions: TransactionBatchParams, provider: JsonRpcBatchInternal) => {
  // The parameters schema ensures all transactions have empty or different nonces,
  // so if we find the first one is populated, we know the rest should be both populated & unique.
  if (transactions[0].nonce) {
    return;
  }
  const nonce = await getNonce({
    from: transactions[0].from,
    provider,
  });

  return Promise.all(
    transactions.map(async (transaction, index) => {
      transaction.nonce = String(nonce + index);
    }),
  );
};
