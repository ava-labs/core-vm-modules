import { Avalanche } from '@avalabs/core-wallets-sdk';

type ProviderParams = {
  isTestnet: boolean;
};

export const getProvider = async ({ isTestnet }: ProviderParams): Promise<Avalanche.JsonRpcProvider> => {
  return isTestnet
    ? Avalanche.JsonRpcProvider.getDefaultFujiProvider()
    : Avalanche.JsonRpcProvider.getDefaultMainnetProvider();
};
