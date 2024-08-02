import { Avalanche } from '@avalabs/core-wallets-sdk';

type ProviderParams = {
  isTestnet: boolean;
};

export const getProvider = ({ isTestnet }: ProviderParams): Avalanche.JsonRpcProvider => {
  return isTestnet
    ? Avalanche.JsonRpcProvider.getDefaultFujiProvider()
    : Avalanche.JsonRpcProvider.getDefaultMainnetProvider();
};
