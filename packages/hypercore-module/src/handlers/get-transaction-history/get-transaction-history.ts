import type { GetTransactionHistory, TransactionHistoryResponse } from '@avalabs/vm-module-types';
import type { HypercoreInfoClient } from '../../utils/info-client';
import { fetchHypercoreActivity } from '../../utils/activity/fetch-hypercore-activity';
import { mapHypercoreActivityToTransactions } from '../../utils/activity/map-hypercore-activity-to-transactions';

export const getTransactionHistory = async ({
  address,
  network,
  infoClient,
}: GetTransactionHistory & {
  infoClient: HypercoreInfoClient;
}): Promise<TransactionHistoryResponse> => {
  const items = await fetchHypercoreActivity(infoClient, address);
  return {
    transactions: mapHypercoreActivityToTransactions(items, address, network),
  };
};
