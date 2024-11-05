import { info } from '@avalabs/avalanchejs';
import { AVALANCHE_XP_NETWORK, AVALANCHE_P_DEV_NETWORK, AVALANCHE_XP_TEST_NETWORK } from '@avalabs/core-chains-sdk';
import { Avalanche } from '@avalabs/core-wallets-sdk';
import { NetworkVMType } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';

type ProviderParams = {
  isTestnet: boolean;
  vmName: NetworkVMType;
};

export const getProvider = async ({ isTestnet, vmName }: ProviderParams): Promise<Avalanche.JsonRpcProvider> => {
  if (vmName !== NetworkVMType.AVM && vmName !== NetworkVMType.PVM) {
    throw rpcErrors.invalidParams('avalanche-module: cannot get provider for non-avm or pvm network');
  }
  const network =
    isTestnet && vmName !== NetworkVMType.AVM
      ? AVALANCHE_P_DEV_NETWORK
      : isTestnet
      ? AVALANCHE_XP_TEST_NETWORK
      : AVALANCHE_XP_NETWORK;
  const upgradesInfo = await new info.InfoApi(network.rpcUrl).getUpgradesInfo().catch(() => undefined);
  return isTestnet
    ? Avalanche.JsonRpcProvider.getDefaultFujiProvider(upgradesInfo)
    : Avalanche.JsonRpcProvider.getDefaultMainnetProvider(upgradesInfo);
};
