import type Blockaid from '@blockaid/client';
import type { SolanaNetworkName } from '@src/types';

export type ExplainTxParams = {
  params: {
    account: string;
    chain: SolanaNetworkName;
    transactionBase64: string;
  };
  dAppUrl: string;
  blockaid: Blockaid;
};
