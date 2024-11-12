import { info } from '@avalabs/avalanchejs';
import { AVALANCHE_P_DEV_NETWORK, AVALANCHE_XP_NETWORK, AVALANCHE_XP_TEST_NETWORK } from '@avalabs/core-chains-sdk';
import { Avalanche } from '@avalabs/core-wallets-sdk';

type ProviderParams = {
  isTestnet: boolean;
  isDevnet?: boolean;
};

export const getProvider = async ({ isTestnet, isDevnet }: ProviderParams): Promise<Avalanche.JsonRpcProvider> => {
  const network = isDevnet
    ? { ...AVALANCHE_P_DEV_NETWORK, rpcUrl: 'http://127.0.0.1:9656' }
    : isTestnet
    ? AVALANCHE_XP_TEST_NETWORK
    : AVALANCHE_XP_NETWORK;
  const upgradesInfo = await new info.InfoApi(network.rpcUrl).getUpgradesInfo().catch(() => undefined);

  // TODO(@meeh0w): remove `isDevnet` case after E-upgrade activation on Fuji
  if (isDevnet) {
    const upgradesInfo = await new info.InfoApi(network.rpcUrl).getUpgradesInfo();
    return Avalanche.JsonRpcProvider.getDefaultDevnetProvider(upgradesInfo);
  }

  return isTestnet
    ? Avalanche.JsonRpcProvider.getDefaultFujiProvider(upgradesInfo)
    : Avalanche.JsonRpcProvider.getDefaultMainnetProvider(upgradesInfo);
};
