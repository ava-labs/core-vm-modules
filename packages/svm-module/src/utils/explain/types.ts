import type { SolanaNetworkName } from '@src/types';

export type ExplainTxParams = {
  proxyApiUrl: string;
  params: {
    account: string;
    chain: SolanaNetworkName;
    transactionBase64: string;
  };
  dAppUrl: string;
};
