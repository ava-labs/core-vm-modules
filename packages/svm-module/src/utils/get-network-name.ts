import type { Network } from '@avalabs/vm-module-types';

import { SOLANA_DEVNET_CAIP2_ID, SOLANA_MAINNET_CAIP2_ID, SOLANA_TESTNET_CAIP2_ID } from '../constants';

export const getNetworkName = (network: Network) => {
  switch (network.caipId) {
    case SOLANA_MAINNET_CAIP2_ID:
      return 'mainnet';

    case SOLANA_DEVNET_CAIP2_ID:
      return 'devnet';

    case SOLANA_TESTNET_CAIP2_ID:
      return 'testnet';

    default:
      throw new Error('Unrecognized CAIP-2 id: ' + network.caipId);
  }
};
