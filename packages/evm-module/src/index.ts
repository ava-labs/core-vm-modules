import { parseManifest } from '@internal/types';
import type { Module } from '@internal/types';

export const evm: Module = {
  getManifest: () => {
    const manifest = require('./manifest.json');
    const result = parseManifest(manifest);
    return result.success ? result.data : undefined;
  },
  getBalances: () => {
    return Promise.resolve('EVM balances');
  },
  getTransactionHistory: () => {
    return Promise.resolve('EVM transaction history');
  },
  getNetworkFee: () => {
    return Promise.resolve('EVM network fee');
  },
  getAddress: () => {
    return Promise.resolve('EVM address');
  },
};
