import Blockaid from '@blockaid/client';
import { base58, base64 } from '@scure/base';

import type { ExplainTxParams } from '../types';

export const scanSolanaTransaction = async ({
  params,
  dAppUrl,
  blockaid,
}: ExplainTxParams): Promise<Blockaid.Solana.Message.MessageScanResponse | null> => {
  try {
    return await blockaid.solana.message.scan({
      chain: params.chain,
      options: ['simulation', 'validation'],
      encoding: 'base64',
      metadata: {
        url: dAppUrl,
      },
      transactions: [params.transactionBase64],
      // We need to encode the account address to base64 as well
      account_address: base64.encode(base58.decode(params.account)),
    });
  } catch (err) {
    console.error('solana.message.scan() error', err);
    return null;
  }
};
