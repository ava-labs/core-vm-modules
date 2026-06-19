import { Avalanche } from '@avalabs/core-wallets-sdk';
import type { Network } from '@avalabs/vm-module-types';

export const getProvider = async (network: Network): Promise<Avalanche.JsonRpcProvider> => {
  const { isTestnet, isDevnet, rpcUrl, customRpcHeaders } = network;
  const fetchOptions: RequestInit | undefined = customRpcHeaders ? { headers: customRpcHeaders } : undefined;

  if (isDevnet) {
    return Avalanche.JsonRpcProvider.fromBaseURL(rpcUrl);
  }

  return isTestnet
    ? Avalanche.JsonRpcProvider.getDefaultFujiProvider(fetchOptions)
    : Avalanche.JsonRpcProvider.getDefaultMainnetProvider(fetchOptions);
};
