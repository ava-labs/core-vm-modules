import { Avalanche } from '@avalabs/core-wallets-sdk';

type ProviderParams = {
  isTestnet: boolean;
  isDevnet?: boolean;
};

export const getProvider = ({ isDevnet, isTestnet }: ProviderParams): Avalanche.JsonRpcProvider => {
  return isDevnet
    ? Avalanche.JsonRpcProvider.getDefaultDevnetProvider()
    : isTestnet
    ? Avalanche.JsonRpcProvider.getDefaultFujiProvider()
    : Avalanche.JsonRpcProvider.getDefaultMainnetProvider();
};
