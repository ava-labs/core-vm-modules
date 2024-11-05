import { info } from '@avalabs/avalanchejs';
import { AVALANCHE_XP_NETWORK, AVALANCHE_XP_TEST_NETWORK } from '@avalabs/core-chains-sdk';
import { Avalanche } from '@avalabs/core-wallets-sdk';

type ProviderParams = {
  isTestnet: boolean;
};

export const getProvider = async ({ isTestnet }: ProviderParams): Promise<Avalanche.JsonRpcProvider> => {
  const network = isTestnet ? AVALANCHE_XP_TEST_NETWORK : AVALANCHE_XP_NETWORK;
  const upgradesInfo = await new info.InfoApi(network.rpcUrl).getUpgradesInfo().catch(() => undefined);
  return isTestnet
    ? Avalanche.JsonRpcProvider.getDefaultFujiProvider(upgradesInfo)
    : Avalanche.JsonRpcProvider.getDefaultMainnetProvider(upgradesInfo);
};
