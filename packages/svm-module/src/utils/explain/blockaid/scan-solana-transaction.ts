import http from 'http';
import Blockaid from '@blockaid/client';
import { base58, base64 } from '@scure/base';

import type { ExplainTxParams } from '../types';

const DUMMY_API_KEY = 'DUMMY_API_KEY'; // since we're using our own proxy and api key is handled there, we can use a dummy key here

export const scanSolanaTransaction = async ({
  proxyApiUrl,
  params,
  dAppUrl,
}: ExplainTxParams): Promise<Blockaid.Solana.Message.MessageScanResponse | null> => {
  const blockaid = new Blockaid({
    baseURL: proxyApiUrl + '/proxy/blockaid/',
    apiKey: DUMMY_API_KEY,
    fetch: global.fetch,
    httpAgent: new http.Agent({ keepAlive: false }),
  });

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
