import { Avalanche } from '@avalabs/core-wallets-sdk';

type ProviderParams = {
  isTestnet: boolean;
  customRpcHeaders?: Record<string, string>;
};

export const getProvider = async ({
  isTestnet,
  customRpcHeaders,
}: ProviderParams): Promise<Avalanche.JsonRpcProvider> => {
  const fetchOptions: RequestInit | undefined = customRpcHeaders ? { headers: customRpcHeaders } : undefined;

  return isTestnet
    ? Avalanche.JsonRpcProvider.getDefaultFujiProvider(fetchOptions)
    : Avalanche.JsonRpcProvider.getDefaultMainnetProvider(fetchOptions);
};
