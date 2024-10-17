import { Info } from '@avalabs/avalanchejs';
import { AVALANCHE_XP_NETWORK, AVALANCHE_XP_TEST_NETWORK } from '@avalabs/core-chains-sdk';
import { Avalanche } from '@avalabs/core-wallets-sdk';

type ProviderParams = {
  isTestnet: boolean;
};
export const AVALANCHE_TESTNET_API_URL = 'https://etna.avax-dev.network';

export const getProvider = async ({ isTestnet }: ProviderParams): Promise<Avalanche.JsonRpcProvider> => {
  const network = isTestnet
    ? { ...AVALANCHE_XP_TEST_NETWORK, rpcUrl: AVALANCHE_TESTNET_API_URL }
    : AVALANCHE_XP_NETWORK;
  const upgradesInfo = await new Info(network.rpcUrl)
    .getUpgradesInfo()
    .then((info) => info)
    .catch(() => undefined);
  return isTestnet
    ? Avalanche.JsonRpcProvider.getDefaultFujiProvider(upgradesInfo)
    : Avalanche.JsonRpcProvider.getDefaultMainnetProvider(upgradesInfo);
};
