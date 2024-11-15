import { ChainId } from '@avalabs/core-chains-sdk';
import type { Network } from '@avalabs/vm-module-types';

export const isDevnet = (network: Network) =>
  network.chainId === ChainId.AVALANCHE_DEVNET_P ||
  network.chainId === 43117 ||
  network.chainId === ChainId.AVALANCHE_DEVNET_X;
