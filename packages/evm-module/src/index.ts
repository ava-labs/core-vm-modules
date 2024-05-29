import { parseManifest } from '@avalabs/core-module';
import type { Module } from '@avalabs/core-module';

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
