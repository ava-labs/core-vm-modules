import type { SigningResult } from '@avalabs/vm-module-types';
import type { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';

export const getTxHash = async (provider: JsonRpcBatchInternal, response: SigningResult) => {
  if ('txHash' in response) {
    return response.txHash;
  }

  // broadcast the signed transaction
  const txHash = await provider.send('eth_sendRawTransaction', [response.signedData]);
  return txHash;
};
