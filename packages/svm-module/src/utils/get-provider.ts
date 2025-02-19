import { createSolanaRpc } from '@solana/rpc';
import { devnet, mainnet, testnet, type ClusterUrl } from '@solana/rpc-types';

import {
  RPC_URL_DEVNET,
  RPC_URL_PROXY_API_ENDPOINT,
  RPC_URL_TESTNET,
  SOLANA_DEVNET_CAIP2_ID,
  SOLANA_MAINNET_CAIP2_ID,
  SOLANA_TESTNET_CAIP2_ID,
} from '../constants';

export const getProvider = ({ caipId, proxyApiUrl }: { caipId: string; proxyApiUrl: string }) => {
  const clusterUrl = getClusterUrl(proxyApiUrl, caipId);
  return createSolanaRpc(clusterUrl);
};

export const getClusterUrl = (proxyApiUrl: string, caip2Id: string | number): ClusterUrl => {
  switch (caip2Id) {
    case SOLANA_MAINNET_CAIP2_ID:
      return mainnet(proxyApiUrl + RPC_URL_PROXY_API_ENDPOINT);

    case SOLANA_DEVNET_CAIP2_ID:
      return devnet(RPC_URL_DEVNET);

    case SOLANA_TESTNET_CAIP2_ID:
      return testnet(RPC_URL_TESTNET);

    default:
      throw new Error('Unknown CAIP-2 ID for Solana: ' + caip2Id);
  }
};
