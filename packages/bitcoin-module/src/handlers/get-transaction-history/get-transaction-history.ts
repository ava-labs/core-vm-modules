import type { Network } from '@avalabs/vm-module-types';

import { getProvider } from '../../utils/get-provider';

import { convertBtcTransaction } from './convert-btc-transaction';

type GetBtcTransactionHistoryOptions = {
  network: Network;
  address: string;
  proxyApiUrl: string;
};

export const getTransactionHistory = async ({ address, network, proxyApiUrl }: GetBtcTransactionHistoryOptions) => {
  const provider = await getProvider({ isTestnet: Boolean(network.isTestnet), proxyApiUrl });
  const rawHistory = await provider.getTxHistory(address);

  return rawHistory.map((tx) =>
    convertBtcTransaction(tx, {
      address,
      network,
    }),
  );
};
