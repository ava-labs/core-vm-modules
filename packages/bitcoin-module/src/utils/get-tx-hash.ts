import type { SigningResult } from '@avalabs/vm-module-types';
import type { BitcoinProvider } from '@avalabs/core-wallets-sdk';

export const getTxHash = async (provider: BitcoinProvider, response: SigningResult) => {
  if ('txHash' in response) {
    return response.txHash;
  }

  return provider.issueRawTx(response.signedData);
};
